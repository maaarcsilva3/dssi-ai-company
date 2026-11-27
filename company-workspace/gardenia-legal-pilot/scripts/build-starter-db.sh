#!/usr/bin/env bash
# Build portable app/starter.db on the host (schema + demo seed).
# Use when refreshing seed data or if starter.db was not included in the deploy bundle.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app"
cd "$APP"

if [[ ! -d node_modules/drizzle-orm ]]; then
  echo "Installing app dependencies…"
  npm ci
fi

rm -f starter.db
export DATABASE_PATH="$APP/starter.db"
npm run db:setup
npm run db:seed

if [[ ! -s starter.db ]]; then
  echo "ERROR: starter.db missing or empty after seed." >&2
  exit 1
fi

echo "OK: $APP/starter.db ($(du -h starter.db | awk '{print $1}'))"