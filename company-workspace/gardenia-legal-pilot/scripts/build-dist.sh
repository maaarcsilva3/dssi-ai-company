#!/usr/bin/env bash
# Slim Linux dist: Next standalone (Docker, Linux native modules) + starter.db (portable SQLite).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is required to build Linux dist (better-sqlite3 is platform-specific)." >&2
  exit 1
fi

echo "Removing existing dist/"
rm -rf dist
mkdir -p dist

export DOCKER_BUILDKIT=1
PLATFORM="${DIST_PLATFORM:-linux/amd64}"

docker build \
  --platform "$PLATFORM" \
  -f app/Dockerfile.dist \
  --target export \
  --output "type=local,dest=./dist" \
  ./app

if [[ ! -f dist/server.js ]]; then
  echo "ERROR: dist/server.js missing after export." >&2
  exit 1
fi

# starter.db: portable SQLite file (no native code). Built on the host to avoid qemu+sqlite
# segfaults when cross-compiling amd64 on Apple Silicon; runtime reads it on Linux only.
echo "Building starter.db (schema + seed on build host)…"
if [[ ! -d app/node_modules/better-sqlite3 ]]; then
  (cd app && npm ci)
fi
rm -f dist/starter.db
DATABASE_PATH="$ROOT/dist/starter.db" npm run db:setup --prefix "$ROOT/app"
DATABASE_PATH="$ROOT/dist/starter.db" npm run db:seed --prefix "$ROOT/app"

if [[ ! -s dist/starter.db ]]; then
  echo "ERROR: dist/starter.db missing or empty." >&2
  exit 1
fi

if [[ -d dist/scripts ]] || [[ -d dist/src ]] || [[ -f dist/node_modules/.bin/tsx ]]; then
  echo "WARN: dist contains dev artifacts (scripts/src/tsx) — slim export may be broken." >&2
fi

SIZE="$(du -sh dist | awk '{print $1}')"
echo "OK: Linux dist ready at $ROOT/dist (size: $SIZE, platform: $PLATFORM)"
echo "Copy to server: docker-compose.yml, dist/, and optionally README.md"