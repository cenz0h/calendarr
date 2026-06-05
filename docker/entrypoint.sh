#!/bin/sh
set -e

# Unraid-friendly user mapping. Defaults match Unraid (nobody:users = 99:100).
# Override via PUID/PGID env vars on other Linux hosts (typically 1000:1000).
PUID="${PUID:-99}"
PGID="${PGID:-100}"

# Make /config writable by the chosen uid/gid before we drop privileges.
# Bind-mounted from the host, so ownership is whatever the host set it to.
mkdir -p /config
chown "${PUID}:${PGID}" /config 2>/dev/null || true

echo "[entrypoint] starting as ${PUID}:${PGID}"
exec su-exec "${PUID}:${PGID}" "$@"
