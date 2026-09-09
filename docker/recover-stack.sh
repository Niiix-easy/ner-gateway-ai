#!/usr/bin/env sh
# Recuperação rápida quando o site está fora (522 / connection reset / timeout).
# Uso na VPS: cd /opt/platform && sh docker/recover-stack.sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".docker/stack.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Erro: $ENV_FILE não encontrado. Rode install ou crie o stack.env." >&2
  exit 1
fi

echo "=== Plataforma: recuperação do stack ==="
echo "Diretório: $ROOT_DIR"
echo ""

# uploads.ini como diretório quebra app/scheduler; /gateway no host é lixo de compose dentro do agente.
if [ -e docker/php/uploads.ini ] && { [ -d docker/php/uploads.ini ] || [ ! -f docker/php/uploads.ini ]; }; then
  echo "Corrigindo docker/php/uploads.ini (não era arquivo)..."
  rm -rf docker/php/uploads.ini
fi
mkdir -p docker/php
if [ ! -f docker/php/uploads.ini ]; then
  cat > docker/php/uploads.ini <<'EOF'
upload_max_filesize = 512M
post_max_size = 512M
memory_limit = 512M
max_execution_time = 300
EOF
fi
if [ -d /gateway/docker ] && [ "$ROOT_DIR" != "/gateway" ]; then
  echo "Aviso: /gateway no host (paths errados do agente) — remova manualmente se não for symlink: rm -rf /gateway" >&2
fi
echo ""

# Exports antigos na shell root sobrescrevem o --env-file e quebram o Postgres.
unset PLATFORM_DB_CONNECTION PLATFORM_DB_HOST PLATFORM_DB_PORT PLATFORM_DB_DATABASE PLATFORM_DB_USERNAME PLATFORM_DB_PASSWORD 2>/dev/null || true
set -a
# shellcheck disable=SC1091
. "$ENV_FILE"
set +a

COMPOSE_FILE="$(sh docker/detect-compose-files.sh 2>/dev/null || echo 'docker-compose.yml')"
PROJECT="${PLATFORM_COMPOSE_PROJECT_NAME:-platform}"
COMPOSE=(docker compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
if [ -f .env ]; then
  COMPOSE+=(--env-file .env)
fi
echo "Compose detectado: $COMPOSE_FILE (project: $PROJECT)"
echo "PLATFORM_DB_USERNAME=${PLATFORM_DB_USERNAME:-?}"
echo "PLATFORM_DB_DATABASE=${PLATFORM_DB_DATABASE:-platform}"
echo ""

echo "=== 1) Estado dos containers ==="
"${COMPOSE[@]}" ps -a 2>/dev/null || true
echo ""

echo "=== 2) Últimas linhas do app (procure 'Banco indisponível' ou 'role does not exist') ==="
"${COMPOSE[@]}" logs app --tail 40 2>/dev/null || docker logs platform-app-1 --tail 40 2>/dev/null || true
echo ""

if [ "$COMPOSE_FILE" = "docker-compose.caddy.yml" ]; then
  echo "=== 3) Logs Caddy ==="
  "${COMPOSE[@]}" logs caddy --tail 25 2>/dev/null || true
  echo ""
fi

echo "=== 4) Teste PostgreSQL com credenciais do stack.env ==="
DB_USER="${PLATFORM_DB_USERNAME:-platform}"
DB_NAME="${PLATFORM_DB_DATABASE:-platform}"
PG_CONTAINER=""
for c in platform-postgres-1 platform_postgres_1; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$c"; then
    PG_CONTAINER="$c"
    break
  fi
done
if [ -n "$PG_CONTAINER" ]; then
  if docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c 'SELECT 1' >/dev/null 2>&1; then
    echo "OK: psql -U $DB_USER -d $DB_NAME"
  else
    echo "FALHOU: $ENV_FILE não coincide com o volume Postgres (role inexistente ou senha errada)." >&2
  VOLUME_ENV="$(docker run --rm -v platform_platform_env:/v alpine cat /v/stack.env 2>/dev/null || true)"
  if [ -n "$VOLUME_ENV" ]; then
    echo ""
    echo "Credenciais no volume platform_env (instalação original):" >&2
    echo "$VOLUME_ENV" | grep PLATFORM_DB_ || true
    echo ""
    echo "A restaurar $ENV_FILE a partir do volume..." >&2
    printf '%s\n' "$VOLUME_ENV" > "$ENV_FILE"
    chmod 600 "$ENV_FILE" 2>/dev/null || true
    unset PLATFORM_DB_CONNECTION PLATFORM_DB_HOST PLATFORM_DB_PORT PLATFORM_DB_DATABASE PLATFORM_DB_USERNAME PLATFORM_DB_PASSWORD 2>/dev/null || true
    set -a
    # shellcheck disable=SC1091
    . "$ENV_FILE"
    set +a
    DB_USER="${PLATFORM_DB_USERNAME:-platform}"
    if docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c 'SELECT 1' >/dev/null 2>&1; then
      echo "OK após sync: psql -U $DB_USER -d $DB_NAME"
    else
      echo "Ainda falhou após sync. Roles no Postgres:" >&2
      docker exec "$PG_CONTAINER" psql -U postgres -d "$DB_NAME" -c '\du' 2>/dev/null || true
    fi
  else
    echo "  Volume platform_platform_env sem stack.env — ajuste PLATFORM_DB_* manualmente." >&2
    docker exec "$PG_CONTAINER" psql -U postgres -d "$DB_NAME" -c '\du' 2>/dev/null || true
  fi
  fi
else
  echo "Aviso: container postgres não encontrado." >&2
fi
echo ""

echo "=== 5) Sincronizar .env do host (Compose lê .env na raiz) ==="
if [ -f docker/ensure-host-dotenv.sh ]; then
  sh docker/ensure-host-dotenv.sh
else
  if [ ! -f .env ] || [ ! -s .env ]; then
    {
      echo "PLATFORM_DB_CONNECTION=${PLATFORM_DB_CONNECTION:-pgsql}"
      echo "PLATFORM_DB_HOST=${PLATFORM_DB_HOST:-postgres}"
      echo "PLATFORM_DB_PORT=${PLATFORM_DB_PORT:-5432}"
      echo "PLATFORM_DB_DATABASE=${PLATFORM_DB_DATABASE:-platform}"
      echo "PLATFORM_DB_USERNAME=${PLATFORM_DB_USERNAME}"
      echo "PLATFORM_DB_PASSWORD=${PLATFORM_DB_PASSWORD}"
      echo "PLATFORM_APP_URL=${PLATFORM_APP_URL:-http://localhost}"
    } > .env
    echo "Criado .env a partir de $ENV_FILE"
  else
    echo ".env já existe ($(wc -c < .env | tr -d ' ') bytes)"
  fi
fi
echo ""

echo "=== 6) Rebuild app (limites PHP na imagem) + subir stack ==="
"${COMPOSE[@]}" build app
"${COMPOSE[@]}" up -d --force-recreate --no-deps app queue
echo ""

echo "Aguardando app (health /up, até 3 min)..."
APP_OK=0
for i in $(seq 1 90); do
  if "${COMPOSE[@]}" exec -T app php -r "exit(@file_get_contents('http://127.0.0.1/up')===false?1:0);" 2>/dev/null; then
    APP_OK=1
    break
  fi
  sleep 2
done
if [ "$APP_OK" -ne 1 ]; then
  echo "App não respondeu em /up — logs:" >&2
  "${COMPOSE[@]}" logs app --tail 40 2>/dev/null || true
  exit 1
fi

if [ "$COMPOSE_FILE" = "docker-compose.caddy.yml" ]; then
  echo "Recriando Caddy..."
  "${COMPOSE[@]}" up -d --force-recreate --no-deps caddy
fi
"${COMPOSE[@]}" up -d --remove-orphans
echo ""

echo "Aguardando estabilização (5s)..."
sleep 5
echo ""

echo "=== 7) Teste HTTP local ==="
if curl -sI --max-time 8 http://127.0.0.1/ 2>/dev/null | head -5; then
  echo ""
  echo "HTTP no servidor OK. Se o browser ainda mostra 522, o problema é Cloudflare → IP/porta do VPS."
else
  echo "HTTP local ainda falhou." >&2
  echo "Logs app:" >&2
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs app --tail 30 2>/dev/null || true
  exit 1
fi

echo ""
echo "=== Recuperação concluída ==="
echo "Se precisar atualizar código: bash update.sh (no diretório da instalação)"
