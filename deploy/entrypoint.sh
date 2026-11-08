#!/bin/sh
# Railway and most container platforms mount volumes owned by root. The app runs as the
# unprivileged node user, so it cannot create the database until ownership is corrected.
# This runs as root, fixes the mount, then drops privileges before starting the server.
set -e

DATA_DIR="${DATA_DIR:-/app/data}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  chown -R node:node "$DATA_DIR" 2>/dev/null || true
  exec su-exec node "$@" 2>/dev/null || exec su node -s /bin/sh -c 'exec "$0" "$@"' "$@"
fi

exec "$@"
