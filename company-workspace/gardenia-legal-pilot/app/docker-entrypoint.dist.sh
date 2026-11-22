#!/bin/sh
set -e
mkdir -p "$(dirname "$DATABASE_PATH")"
if [ ! -f "$DATABASE_PATH" ] || [ ! -s "$DATABASE_PATH" ]; then
  echo "First boot: copying starter.db → $DATABASE_PATH"
  cp /app/starter.db "$DATABASE_PATH"
fi
exec node server.js
