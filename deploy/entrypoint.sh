#!/bin/sh
# Container entrypoint.
#
# Two things must be true before the app starts:
#   1. the mounted volume must be writable by the runtime user, and
#   2. the process must not keep root after that.
#
# Railway mounts volumes owned by root. The app runs as the unprivileged node user, so the
# database cannot be created until ownership is corrected. This script runs as root, fixes
# the mount, then re-executes the command as node.
set -e

DATA_DIR="${DATA_DIR:-/app/data}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  chown -R node:node "$DATA_DIR" 2>/dev/null || true
  # setpriv ships with util-linux in node:*-slim; fall back to su if it is missing.
  if command -v setpriv >/dev/null 2>&1; then
    exec setpriv --reuid=node --regid=node --init-groups "$@"
  fi
  exec su node -s /bin/sh -c 'exec "$@"' -- "$@"
fi

exec "$@"
