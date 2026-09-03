#!/bin/sh
set -eu

runtime_dir="/usr/share/nginx/html/runtime"
mkdir -p "$runtime_dir"

if [ -n "${DECK_URL:-}" ]; then
  escaped_url=$(printf '%s' "$DECK_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf '{"deckUrl":"%s"}\n' "$escaped_url" > "$runtime_dir/config.json"
else
  printf '{}\n' > "$runtime_dir/config.json"
fi
