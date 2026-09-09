#!/bin/sh
# Copia plugins empacotados na imagem para /var/www/html/plugins (volume).
# - Não apaga plugins instalados pelo usuário que não estejam no bundle.
# - Atualiza (sobrescreve) apenas os slugs presentes em /opt/platform-bundled-plugins.
# Uso: chamado pelo entrypoint em todo container que monta platform_plugins.
set -eu

BUNDLED="${PLATFORM_BUNDLED_PLUGINS_DIR:-/opt/platform-bundled-plugins}"
TARGET="${PLATFORM_PLUGINS_DIR:-/var/www/html/plugins}"

if [ ! -d "$BUNDLED" ]; then
  exit 0
fi

mkdir -p "$TARGET"

# shellcheck disable=SC2012
count="$(ls -A "$BUNDLED" 2>/dev/null | wc -l | tr -d ' ')"
if [ "$count" = "0" ]; then
  exit 0
fi

for src in "$BUNDLED"/*; do
  [ -e "$src" ] || continue
  [ -d "$src" ] || continue
  slug="$(basename "$src")"
  # Só pastas com manifest válido
  if [ ! -f "$src/plugin.json" ]; then
    continue
  fi
  dest="$TARGET/$slug"
  mkdir -p "$dest"
  # cp -a preserva; -f sobrescreve ficheiros do bundle sem tocar em outros slugs
  cp -a "$src"/. "$dest"/
done

chmod -R 777 "$TARGET" 2>/dev/null || true
