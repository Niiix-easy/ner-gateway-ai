#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${PLATFORM_REPO_URL:-}"
BRANCH="${PLATFORM_BRANCH:-main}"
INSTALL_DIR="${PLATFORM_DIR:-/opt/platform}"
HTTP_PORT="${PLATFORM_HTTP_PORT:-80}"
HTTPS_PORT="${PLATFORM_HTTPS_PORT:-443}"
SWAP_MODE="${PLATFORM_SWAP_MODE:-auto}"

if [ "$(uname -s)" != "Linux" ]; then
  echo "Este instalador é para Linux." >&2
  exit 1
fi

if ! command -v bash >/dev/null 2>&1; then
  echo "bash não encontrado." >&2
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "Distribuição não suportada (precisa de apt-get, ex.: Ubuntu/Debian)." >&2
  exit 1
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    echo "Rode como root ou instale sudo." >&2
    exit 1
  fi
fi

export DEBIAN_FRONTEND=noninteractive

$SUDO apt-get update -y
$SUDO apt-get install -y ca-certificates curl git gnupg lsb-release

if [ "$SWAP_MODE" != "off" ]; then
  MEM_KB="$(awk '/^MemTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
  SWAP_KB="$(awk '/^SwapTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
  MEM_GB=$(( (MEM_KB + 1048575) / 1048576 ))

  SHOULD_CREATE_SWAP=0
  if [ "$SWAP_MODE" = "on" ]; then
    SHOULD_CREATE_SWAP=1
  elif [ "$SWAP_MODE" = "auto" ]; then
    if [ "$SWAP_KB" -eq 0 ] && [ "$MEM_GB" -gt 0 ] && [ "$MEM_GB" -le 8 ]; then
      SHOULD_CREATE_SWAP=1
    fi
  fi

  if [ "$SHOULD_CREATE_SWAP" -eq 1 ]; then
    if ! swapon --show 2>/dev/null | awk 'NR>1 {print $1}' | grep -q '^/swapfile$'; then
      if [ ! -f /swapfile ]; then
        SWAP_GB=4
        if [ "$MEM_GB" -le 2 ]; then
          SWAP_GB=2
        fi

        if command -v fallocate >/dev/null 2>&1; then
          $SUDO fallocate -l "${SWAP_GB}G" /swapfile
        else
          $SUDO dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_GB * 1024)) status=progress
        fi
        $SUDO chmod 600 /swapfile
        $SUDO mkswap /swapfile >/dev/null
      fi

      $SUDO swapon /swapfile || true
      if ! grep -Eq '^\s*/swapfile\s+' /etc/fstab; then
        echo "/swapfile none swap sw 0 0" | $SUDO tee -a /etc/fstab >/dev/null
      fi
    fi
  fi
fi

if ! command -v docker >/dev/null 2>&1; then
  $SUDO install -m 0755 -d /etc/apt/keyrings
  $SUDO rm -f /etc/apt/keyrings/docker.gpg
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  $SUDO chmod a+r /etc/apt/keyrings/docker.gpg

  CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME:-}")"
  if [ -z "$CODENAME" ]; then
    CODENAME="$(lsb_release -cs 2>/dev/null || true)"
  fi
  if [ -z "$CODENAME" ]; then
    echo "Não foi possível detectar o codename do Ubuntu/Debian." >&2
    exit 1
  fi

  ARCH="$(dpkg --print-architecture)"
  echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $CODENAME stable" | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null

  $SUDO apt-get update -y
  $SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  $SUDO systemctl enable --now docker >/dev/null 2>&1 || true
fi

if [ -n "${SUDO_USER:-}" ] && id -nG "$SUDO_USER" 2>/dev/null | grep -qw docker; then
  :
elif [ -n "${SUDO_USER:-}" ]; then
  $SUDO usermod -aG docker "$SUDO_USER" || true
fi

if [ -e "$INSTALL_DIR" ] && [ ! -d "$INSTALL_DIR" ]; then
  echo "Destino existe e não é diretório: $INSTALL_DIR" >&2
  exit 1
fi

LEGACY_GIT="${PLATFORM_LEGACY_GIT_UPDATE:-0}"

if [ "$LEGACY_GIT" = "1" ]; then
  if [ -d "$INSTALL_DIR/.git" ]; then
    $SUDO git -C "$INSTALL_DIR" remote set-url origin "$REPO_URL" >/dev/null 2>&1 || true
    $SUDO git -C "$INSTALL_DIR" fetch --all --prune
    $SUDO git -C "$INSTALL_DIR" checkout -B "$BRANCH" "origin/$BRANCH"
    $SUDO git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"
  else
    $SUDO mkdir -p "$(dirname "$INSTALL_DIR")"
    $SUDO git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  fi
else
  if [ ! -d "$INSTALL_DIR" ] || [ -z "$(ls -A "$INSTALL_DIR" 2>/dev/null || true)" ]; then
    echo "PLATFORM_LEGACY_GIT_UPDATE não está ativo e o diretório está vazio." >&2
    echo "Envie o pacote descompactado para esse diretório, ou defina PLATFORM_REPO_URL=<seu repositório> e PLATFORM_LEGACY_GIT_UPDATE=1." >&2
    exit 1
  fi
  echo "Modo artefato (Caddy): pulando clone Git — código já no disco."
fi

cd "$INSTALL_DIR"

# shellcheck source=docker/prompt-public-url.sh
. docker/prompt-public-url.sh

# Licença: ativada no wizard /docker-setup (sem agent Node).

$SUDO chmod +x docker/up.sh docker/build-frontend.sh docker/install-composer-deps.sh docker/ensure-upload-limits.sh docker/verify-workers.sh >/dev/null 2>&1 || true

echo ""
echo "=== Limites de upload (PHP / Member Builder) ==="
$SUDO sh docker/ensure-upload-limits.sh

if [ ! -f docker/build-frontend.sh ]; then
  echo "Erro: docker/build-frontend.sh ausente — o painel não pode subir sem assets Vite." >&2
  exit 1
fi
echo ""
echo "=== Build do frontend ==="
$SUDO sh docker/build-frontend.sh
if [ ! -f public/build/manifest.json ]; then
  echo "Erro: public/build/manifest.json não foi gerado. Abortando (evita 500 Vite manifest)." >&2
  exit 1
fi

if [ -f docker/install-composer-deps.sh ]; then
  echo ""
  echo "=== Dependências PHP (Composer) ==="
  $SUDO sh docker/install-composer-deps.sh
fi

if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "(^|:)$HTTP_PORT$"; then
  echo "Erro: porta $HTTP_PORT já está em uso (outro Caddy/Nginx/Apache?)." >&2
  echo "Pare o serviço conflitante, ex.: systemctl stop caddy && systemctl disable caddy" >&2
  echo "Ou use: PLATFORM_HTTP_PORT=8080 PLATFORM_HTTPS_PORT=8443 ..." >&2
  exit 1
fi
if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "(^|:)$HTTPS_PORT$"; then
  echo "Erro: porta $HTTPS_PORT já está em uso." >&2
  echo "Pare o serviço conflitante ou defina PLATFORM_HTTPS_PORT para outra porta." >&2
  exit 1
fi

$SUDO mkdir -p .docker
echo "caddy" | $SUDO tee .docker/compose-profile >/dev/null

if [ -f .docker/stack.env ]; then
  if grep -Eq '^\s*PLATFORM_COMPOSE_FILES\s*=' .docker/stack.env; then
    TMP="$(mktemp)"
    awk 'BEGIN{f=0} $0 ~ /^PLATFORM_COMPOSE_FILES=/ { print "PLATFORM_COMPOSE_FILES=docker-compose.caddy.yml"; f=1; next } { print } END { if (!f) print "PLATFORM_COMPOSE_FILES=docker-compose.caddy.yml" }' .docker/stack.env > "$TMP"
    $SUDO mv "$TMP" .docker/stack.env
  else
    echo "PLATFORM_COMPOSE_FILES=docker-compose.caddy.yml" | $SUDO tee -a .docker/stack.env >/dev/null
  fi
fi

$SUDO env \
  PLATFORM_APP_URL="${PLATFORM_APP_URL:-}" \
  PLATFORM_WEBHOOK_PUBLIC_URL="${PLATFORM_WEBHOOK_PUBLIC_URL:-}" \
  PLATFORM_HTTP_PORT="${HTTP_PORT}" \
  PLATFORM_HTTPS_PORT="${HTTPS_PORT}" \
  PLATFORM_COMPOSE_FILES="docker-compose.caddy.yml" \
  PLATFORM_APP_ENV=production \
  PLATFORM_APP_DEBUG=false \
  sh docker/up.sh

echo ""
echo "=== Verificação de workers (API) ==="
$SUDO sh docker/verify-workers.sh || true

IP="$(curl -fsSL https://api.ipify.org 2>/dev/null || true)"
if [ -z "$IP" ]; then
  IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
fi
if [ -z "$IP" ]; then
  IP="SEU_IP"
fi

echo ""
echo "Plataforma iniciado via Docker (Caddy — portas ${HTTP_PORT}/${HTTPS_PORT})."
echo "Abra: http://$IP:$HTTP_PORT/docker-setup"
echo ""
echo "No wizard: use o DOMÍNIO (ex. loja.seudominio.com), nunca o IP."
echo "Cloudflare: comece em SSL Flexible até o domínio/TLS estabilizar;"
echo "  depois Full + TLS na origem (Let's Encrypt / Origin Cert / PLATFORM_CADDY_TLS_MODE=internal)."
echo "Direto (sem CF): Let's Encrypt automático após o wizard."
echo "Full Strict: Origin Cert em .docker/certs/ + sh docker/fix-caddy-domain.sh"
echo ""
echo "Se você adicionou seu usuário ao grupo docker, reabra o SSH para aplicar."
