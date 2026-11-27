#!/bin/sh
set -e
mkdir -p "$(dirname "$DATABASE_PATH")"
if [ ! -f "$DATABASE_PATH" ] || [ ! -s "$DATABASE_PATH" ]; then
  echo "First boot: copying starter.db → $DATABASE_PATH"
  cp /app/starter.db "$DATABASE_PATH"
fi
echo "Preflight: opening SQLite at $DATABASE_PATH"
node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(process.env.DATABASE_PATH); db.prepare('select 1').get(); db.close(); console.log('Preflight: SQLite OK');"
exec node server.js