#!/usr/bin/env sh
# Carregue com: . docker/prompt-public-url.sh (a partir da raiz do repositório)
# Define PLATFORM_WEBHOOK_PUBLIC_URL e PLATFORM_APP_URL (se ainda vazio) para o Docker/stack.env.
# Sobrescreva exportando PLATFORM_WEBHOOK_PUBLIC_URL / PLATFORM_APP_URL / PLATFORM_DOMAIN antes.

is_ip_host() {
  printf '%s' "$1" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'
}

normalize_host() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -d '\r\n' | sed 's|^https\?://||; s|/.*||; s|:.*||; s/^[[:space:]]*//;s/[[:space:]]*$//'
}

# Prefill do instalador de licença (vps-install).
if [ -z "${PLATFORM_APP_URL:-}" ] && [ -f .docker/install-license.env ]; then
  # shellcheck disable=SC1091
  PLATFORM_APP_URL="$(grep -E '^\s*PLATFORM_APP_URL\s*=' .docker/install-license.env 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d ' \r\n\"' || true)"
  export PLATFORM_APP_URL
fi
if [ -z "${PLATFORM_DOMAIN:-}" ] && [ -f .docker/install-license.env ]; then
  PLATFORM_DOMAIN="$(grep -E '^\s*PLATFORM_DOMAIN\s*=' .docker/install-license.env 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d ' \r\n\"' || true)"
  export PLATFORM_DOMAIN
fi
if [ -z "${PLATFORM_APP_URL:-}" ] && [ -n "${PLATFORM_DOMAIN:-}" ]; then
  export PLATFORM_APP_URL="https://${PLATFORM_DOMAIN}"
fi

PLATFORM_DEFAULT_PUBLIC_URL="${PLATFORM_DEFAULT_PUBLIC_URL:-}"

if [ -z "${PLATFORM_WEBHOOK_PUBLIC_URL:-}" ]; then
  if [ -n "${PLATFORM_APP_URL:-}" ]; then
    export PLATFORM_WEBHOOK_PUBLIC_URL="$PLATFORM_APP_URL"
  elif [ -r /dev/tty ]; then
    echo ""
    echo "URL/domínio público do gateway (NÃO use o IP — a licença vincula ao hostname)."
    printf 'Digite o domínio ou URL (ex.: loja.seudominio.com): ' > /dev/tty
    # shellcheck disable=SC2162
    read -r PLATFORM_PUBLIC_URL_READ < /dev/tty || PLATFORM_PUBLIC_URL_READ=""
    PLATFORM_PUBLIC_URL_READ="$(normalize_host "${PLATFORM_PUBLIC_URL_READ}")"
    if [ -z "$PLATFORM_PUBLIC_URL_READ" ] || is_ip_host "$PLATFORM_PUBLIC_URL_READ"; then
      echo "Domínio inválido ou IP. Abortando — defina PLATFORM_APP_URL=https://seu.dominio.com" >&2
      exit 1
    fi
    case "$PLATFORM_PUBLIC_URL_READ" in
      http://*|https://*) export PLATFORM_WEBHOOK_PUBLIC_URL="$PLATFORM_PUBLIC_URL_READ" ;;
      *) export PLATFORM_WEBHOOK_PUBLIC_URL="https://${PLATFORM_PUBLIC_URL_READ}" ;;
    esac
  elif [ -n "$PLATFORM_DEFAULT_PUBLIC_URL" ]; then
    export PLATFORM_WEBHOOK_PUBLIC_URL="$PLATFORM_DEFAULT_PUBLIC_URL"
  else
    echo "PLATFORM_APP_URL / domínio não definidos e sem TTY para perguntar." >&2
    exit 1
  fi
fi

HOST_CHECK="$(normalize_host "$PLATFORM_WEBHOOK_PUBLIC_URL")"
if is_ip_host "$HOST_CHECK"; then
  echo "Erro: PLATFORM_WEBHOOK_PUBLIC_URL não pode ser IP ($HOST_CHECK). Use um domínio." >&2
  exit 1
fi

if [ -z "${PLATFORM_APP_URL:-}" ]; then
  export PLATFORM_APP_URL="$PLATFORM_WEBHOOK_PUBLIC_URL"
fi
