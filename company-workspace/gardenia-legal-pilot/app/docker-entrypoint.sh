#!/bin/sh
# Local/dev placeholder — production dist uses docker-entrypoint.dist.sh (see scripts/build-dist.sh).
set -e
mkdir -p "$(dirname "$DATABASE_PATH")"
if [ ! -f "$DATABASE_PATH" ] || [ ! -s "$DATABASE_PATH" ]; then
  if [ -f /app/starter.db ]; then
    cp /app/starter.db "$DATABASE_PATH"
  else
    echo "No starter.db — run npm run db:setup && npm run db:seed or build dist." >&2
    exit 1
  fi
fi
exec node server.js