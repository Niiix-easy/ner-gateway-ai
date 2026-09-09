#!/usr/bin/env sh
# Regrava Caddyfile.domains no volume platform_env a partir de .docker/app.url (rodar na raiz do projeto).
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".docker/stack.env"
VOLUME_NAME="${PLATFORM_ENV_VOLUME:-}"
if [ -z "$VOLUME_NAME" ]; then
  PROJECT="$(basename "$ROOT_DIR" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')"
  VOLUME_NAME="${PROJECT}_platform_env"
  if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    VOLUME_NAME="platform_platform_env"
  fi
fi

APP_URL="$(docker run --rm -v "${VOLUME_NAME}:/v" alpine cat /v/app.url 2>/dev/null || true)"
if [ -z "$APP_URL" ]; then
  echo "Erro: não achei app.url no volume ${VOLUME_NAME}" >&2
  exit 1
fi

DOMAIN="$(printf '%s' "$APP_URL" | sed -E 's#https?://##; s#/.*##; s/:.*//')"
if [ -z "$DOMAIN" ]; then
  echo "Erro: domínio inválido em app.url: $APP_URL" >&2
  exit 1
fi

TLS_BLOCK=""
TLS_MODE="${PLATFORM_CADDY_TLS_MODE:-auto}"
if docker run --rm -v "${VOLUME_NAME}:/v" alpine sh -c 'test -s /v/certs/origin.pem && test -s /v/certs/origin-key.pem'; then
  TLS_BLOCK="	tls /etc/platform/certs/origin.pem /etc/platform/certs/origin-key.pem"
  echo "Usando certificado Origin Cloudflare (Full strict)."
elif [ "$TLS_MODE" = "internal" ] || [ "$TLS_MODE" = "selfsigned" ] || [ "$TLS_MODE" = "full" ]; then
  TLS_BLOCK="	tls internal"
  echo "Usando tls internal (Cloudflare Full sem Origin Cert)."
else
  echo "Usando HTTPS automático (Let's Encrypt) — domínio direto / ACME."
fi

# Portal na mesma VPS (demo): PLATFORM_CADDY_PROXY_LOCAL_PORTAL=true no .env do host
PROXY_PORTAL="${PLATFORM_CADDY_PROXY_LOCAL_PORTAL:-}"
if [ -z "$PROXY_PORTAL" ] && [ -f .env ]; then
  PROXY_PORTAL="$(grep -E '^\s*PLATFORM_CADDY_PROXY_LOCAL_PORTAL\s*=' .env 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d ' \r\n\"' || true)"
fi
PORTAL_HOST="${PLATFORM_CADDY_LOCAL_PORTAL_HOST:-portal.plataforma.tech}"
PORTAL_UPSTREAM="${PLATFORM_CADDY_LOCAL_PORTAL_UPSTREAM:-172.17.0.1:8081}"
if [ -f .env ]; then
  _h="$(grep -E '^\s*PLATFORM_CADDY_LOCAL_PORTAL_HOST\s*=' .env 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d ' \r\n\"' || true)"
  _u="$(grep -E '^\s*PLATFORM_CADDY_LOCAL_PORTAL_UPSTREAM\s*=' .env 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d ' \r\n\"' || true)"
  [ -n "$_h" ] && PORTAL_HOST="$_h"
  [ -n "$_u" ] && PORTAL_UPSTREAM="$_u"
fi

PORTAL_BLOCK=""
case "$(printf '%s' "$PROXY_PORTAL" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on)
    PORTAL_BLOCK="http://${PORTAL_HOST} {
	reverse_proxy ${PORTAL_UPSTREAM}
}
${PORTAL_HOST} {
	tls internal
	reverse_proxy ${PORTAL_UPSTREAM}
}
"
    echo "Proxy local do portal: ${PORTAL_HOST} → ${PORTAL_UPSTREAM}"
    ;;
esac

docker run --rm -v "${VOLUME_NAME}:/v" alpine sh -c "cat > /v/Caddyfile.domains <<EOF
# fix-caddy-domain.sh — ${DOMAIN}
${PORTAL_BLOCK}${DOMAIN} {
${TLS_BLOCK}
	reverse_proxy app:80
}
http://${DOMAIN} {
	reverse_proxy app:80
}
EOF"

echo "Caddyfile.domains:"
docker run --rm -v "${VOLUME_NAME}:/v" alpine cat /v/Caddyfile.domains

if [ -f docker-compose.caddy.yml ] && [ -f "$ENV_FILE" ]; then
  echo ""
  echo "Recriando Caddy..."
  COMPOSE_FILE="$(sh docker/detect-compose-files.sh 2>/dev/null || echo 'docker-compose.caddy.yml')"
  PROJECT="${PLATFORM_COMPOSE_PROJECT_NAME:-platform}"
  COMPOSE=(docker compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
  if [ -f .env ]; then
    COMPOSE+=(--env-file .env)
  fi
  "${COMPOSE[@]}" up -d --force-recreate --no-deps caddy
fi
