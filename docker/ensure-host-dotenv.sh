#!/usr/bin/env sh
# Garante .env na raiz a partir de .docker/stack.env (DB + APP_URL).
# Uso: sh docker/ensure-host-dotenv.sh
set -eu

GATEWAY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STACK_ENV="$GATEWAY_DIR/.docker/stack.env"
DOTENV="$GATEWAY_DIR/.env"

if [ ! -f "$STACK_ENV" ] && [ -n "${1:-}" ] && [ "$1" != "$GATEWAY_DIR" ] && [ -f "$1/.docker/stack.env" ]; then
  STACK_ENV="$1/.docker/stack.env"
  DOTENV="$1/.env"
fi

if [ ! -f "$STACK_ENV" ]; then
  echo "ensure-host-dotenv: $STACK_ENV ausente (gateway dir: $GATEWAY_DIR)" >&2
  exit 1
fi

unset PLATFORM_DB_CONNECTION PLATFORM_DB_HOST PLATFORM_DB_PORT PLATFORM_DB_DATABASE PLATFORM_DB_USERNAME PLATFORM_DB_PASSWORD 2>/dev/null || true
set -a
# shellcheck disable=SC1091
. "$STACK_ENV"
set +a

if [ ! -f "$DOTENV" ] || [ ! -s "$DOTENV" ]; then
  {
    echo "PLATFORM_DB_CONNECTION=${PLATFORM_DB_CONNECTION:-pgsql}"
    echo "PLATFORM_DB_HOST=${PLATFORM_DB_HOST:-postgres}"
    echo "PLATFORM_DB_PORT=${PLATFORM_DB_PORT:-5432}"
    echo "PLATFORM_DB_DATABASE=${PLATFORM_DB_DATABASE:-platform}"
    echo "PLATFORM_DB_USERNAME=${PLATFORM_DB_USERNAME:-platform}"
    echo "PLATFORM_DB_PASSWORD=${PLATFORM_DB_PASSWORD:-platform}"
    echo "PLATFORM_APP_URL=${PLATFORM_APP_URL:-http://localhost}"
  } > "$DOTENV"
  echo "ensure-host-dotenv: criado $DOTENV"
fi

chmod 600 "$DOTENV" 2>/dev/null || true
echo "ensure-host-dotenv: OK ($DOTENV)"
