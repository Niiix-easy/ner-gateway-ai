#!/bin/sh
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p .docker

ENV_FILE=".docker/stack.env"
if [ ! -f "$ENV_FILE" ]; then
  HTTP_PORT="${PLATFORM_HTTP_PORT:-80}"
  HTTPS_PORT="${PLATFORM_HTTPS_PORT:-443}"
  APP_URL="${PLATFORM_APP_URL:-http://localhost}"
  WEBHOOK_PUBLIC="${PLATFORM_WEBHOOK_PUBLIC_URL:-$APP_URL}"

  U="platform_$(tr -dc 'a-z0-9' < /dev/urandom | head -c 8)"
  P="$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)"

  cat > "$ENV_FILE" <<EOF
PLATFORM_DB_CONNECTION=pgsql
PLATFORM_DB_HOST=postgres
PLATFORM_DB_PORT=5432
PLATFORM_DB_DATABASE=platform
PLATFORM_DB_USERNAME=$U
PLATFORM_DB_PASSWORD=$P
PLATFORM_APP_URL=$APP_URL
PLATFORM_WEBHOOK_PUBLIC_URL=$WEBHOOK_PUBLIC
PLATFORM_HTTP_PORT=$HTTP_PORT
PLATFORM_HTTPS_PORT=$HTTPS_PORT
PLATFORM_QUEUE_CONNECTION=${PLATFORM_QUEUE_CONNECTION:-redis}
PLATFORM_CACHE_STORE=${PLATFORM_CACHE_STORE:-redis}
PLATFORM_SESSION_DRIVER=${PLATFORM_SESSION_DRIVER:-file}
PLATFORM_REDIS_MAXMEMORY=${PLATFORM_REDIS_MAXMEMORY:-128mb}
PLATFORM_REDIS_MAXMEMORY_POLICY=${PLATFORM_REDIS_MAXMEMORY_POLICY:-allkeys-lru}
PLATFORM_QUEUE_WORKER_MEMORY=${PLATFORM_QUEUE_WORKER_MEMORY:-128}
PLATFORM_QUEUE_WORKER_MAX_TIME=${PLATFORM_QUEUE_WORKER_MAX_TIME:-3600}
PLATFORM_QUEUE_WORKER_MAX_JOBS=${PLATFORM_QUEUE_WORKER_MAX_JOBS:-1000}
PLATFORM_CADDY_HOST=${PLATFORM_CADDY_HOST:-:80}
API_INBOUND_WEBHOOKS_ASYNC=${API_INBOUND_WEBHOOKS_ASYNC:-true}
PLATFORM_APP_ENV=production
PLATFORM_APP_DEBUG=false
PLATFORM_COMPOSE_PROJECT_NAME=$(basename "$ROOT_DIR")
EOF
else
  # Nunca rotacionar USER/PASSWORD em stack.env já existente — o volume Postgres
  # guarda o role da primeira criação. Trocar senha aqui deixa o app "unhealthy"
  # (Banco indisponível) e Caddy responde 502.
  if ! grep -Eq '^\s*PLATFORM_DB_USERNAME\s*=' "$ENV_FILE" 2>/dev/null \
    || ! grep -Eq '^\s*PLATFORM_DB_PASSWORD\s*=' "$ENV_FILE" 2>/dev/null; then
    U="platform_$(tr -dc 'a-z0-9' < /dev/urandom | head -c 8)"
    P="$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)"
    TMP="$(mktemp)"
    awk -v U="$U" -v P="$P" '
      BEGIN { u=0; p=0 }
      $0 ~ /^PLATFORM_DB_USERNAME=/ { print; u=1; next }
      $0 ~ /^PLATFORM_DB_PASSWORD=/ { print; p=1; next }
      { print }
      END {
        if (!u) print "PLATFORM_DB_USERNAME=" U
        if (!p) print "PLATFORM_DB_PASSWORD=" P
      }
    ' "$ENV_FILE" > "$TMP"
    mv "$TMP" "$ENV_FILE"
  fi
fi

if [ -f "$ENV_FILE" ] && ! grep -Eq '^\s*PLATFORM_COMPOSE_PROJECT_NAME\s*=' "$ENV_FILE" 2>/dev/null; then
  echo "PLATFORM_COMPOSE_PROJECT_NAME=$(basename "$ROOT_DIR")" >> "$ENV_FILE"
fi

if [ -f "$ENV_FILE" ] && ! grep -Eq '^\s*PLATFORM_WEBHOOK_PUBLIC_URL\s*=' "$ENV_FILE"; then
  LINE_APP="$(grep -E '^PLATFORM_APP_URL=' "$ENV_FILE" 2>/dev/null | head -1 || true)"
  VAL_APP="${LINE_APP#PLATFORM_APP_URL=}"
  VAL_APP="${PLATFORM_APP_URL:-${VAL_APP:-http://localhost}}"
  echo "PLATFORM_WEBHOOK_PUBLIC_URL=${PLATFORM_WEBHOOK_PUBLIC_URL:-$VAL_APP}" >> "$ENV_FILE"
fi

# Normaliza banco para PostgreSQL em atualizações de ambientes legados.
TMP_DB="$(mktemp)"
awk '
  BEGIN { c=0; h=0; p=0 }
  $0 ~ /^PLATFORM_DB_CONNECTION=/ { print "PLATFORM_DB_CONNECTION=pgsql"; c=1; next }
  $0 ~ /^PLATFORM_DB_HOST=/ { print "PLATFORM_DB_HOST=postgres"; h=1; next }
  $0 ~ /^PLATFORM_DB_PORT=/ { print "PLATFORM_DB_PORT=5432"; p=1; next }
  { print }
  END {
    if (!c) print "PLATFORM_DB_CONNECTION=pgsql"
    if (!h) print "PLATFORM_DB_HOST=postgres"
    if (!p) print "PLATFORM_DB_PORT=5432"
  }
' "$ENV_FILE" > "$TMP_DB"
mv "$TMP_DB" "$ENV_FILE"

# Sempre produção (install/update e deploy Docker).
TMP_PROD="$(mktemp)"
awk '
  BEGIN { env=0; dbg=0 }
  $0 ~ /^PLATFORM_APP_ENV=/ { print "PLATFORM_APP_ENV=production"; env=1; next }
  $0 ~ /^PLATFORM_APP_DEBUG=/ { print "PLATFORM_APP_DEBUG=false"; dbg=1; next }
  { print }
  END {
    if (!env) print "PLATFORM_APP_ENV=production"
    if (!dbg) print "PLATFORM_APP_DEBUG=false"
  }
' "$ENV_FILE" > "$TMP_PROD"
mv "$TMP_PROD" "$ENV_FILE"

# .env na raiz para compose / host tooling
if [ ! -f .env ] || [ ! -s .env ]; then
  APP_URL_VAL="$(grep -E '^PLATFORM_APP_URL=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  if [ -z "$APP_URL_VAL" ]; then
    APP_URL_VAL="http://localhost"
  fi
  cat > .env <<EOF
# Host env for docker compose. Laravel uses .env inside the app container.
APP_URL=${APP_URL_VAL}
PLATFORM_APP_URL=${APP_URL_VAL}
LICENSE_API_URL=
LICENSE_SIGNING_KEY=
LICENSE_KEY=
LICENSE_INSTALL_ID=
EOF
fi

# Prefill de licença/domínio (vps-install) → volume platform_env (PHP lê .docker/ dentro do container).
LICENSE_PREFILL=""
if [ -f .docker/install-license.env ]; then
  LICENSE_PREFILL=".docker/install-license.env"
elif [ -f .install-license.env ]; then
  LICENSE_PREFILL=".install-license.env"
fi
if [ -n "$LICENSE_PREFILL" ]; then
  PROJECT_NAME="$(grep -E '^\s*PLATFORM_COMPOSE_PROJECT_NAME\s*=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d ' \r\n\"' || true)"
  if [ -z "$PROJECT_NAME" ]; then
    PROJECT_NAME="$(basename "$ROOT_DIR" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9-')"
  fi
  VOLUME_NAME="${PROJECT_NAME}_platform_env"
  docker volume create "$VOLUME_NAME" >/dev/null 2>&1 || true
  docker run --rm \
    -v "${VOLUME_NAME}:/v" \
    -v "${ROOT_DIR}/${LICENSE_PREFILL}:/src:ro" \
    alpine cp /src /v/install-license.env
  echo "Prefill de licença/domínio copiado para volume ${VOLUME_NAME}."
fi

COMPOSE_FILES="${PLATFORM_COMPOSE_FILES:-docker-compose.yml}"
COMPOSE_ARGS=""
OLD_IFS="$IFS"
IFS=';'
for f in $COMPOSE_FILES; do
  if [ -n "$f" ]; then
    COMPOSE_ARGS="$COMPOSE_ARGS -f $f"
  fi
done
IFS="$OLD_IFS"

UP_ARGS="-d --remove-orphans"
if [ "${PLATFORM_SKIP_DOCKER_BUILD:-0}" != "1" ]; then
  UP_ARGS="--build ${UP_ARGS}"
fi

docker compose $COMPOSE_ARGS --env-file "$ENV_FILE" up $UP_ARGS
