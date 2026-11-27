# Runnable production image — build on the Linux server:
#   cd gardenia-legal-pilot && docker compose up --build -d
#
# Requires app/starter.db in the build context (portable SQLite; no native addons).
# Do NOT run db:setup/db:seed here — use host scripts to refresh starter.db only.
# Prep on Windows: scripts/build-starter-db.ps1 — or ship committed app/starter.db in the tar.
# Prep on Linux (no Docker): scripts/build-starter-db.sh
#
# Node 22+ required (built-in node:sqlite).
#
# IP-root default (empty NEXT_PUBLIC_BASE_PATH). Nginx subpath flip-back:
#   docker compose -f docker-compose.yml -f docker-compose.nginx-subpath.yml up --build -d

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
RUN test -s starter.db || ( \
  echo "ERROR: app/starter.db missing or empty." >&2; \
  echo "  Windows: .\\scripts\\build-starter-db.ps1" >&2; \
  echo "  Linux:   ./scripts/build-starter-db.sh" >&2; \
  exit 1; \
)

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/data/gardenia.db
# Required on Node 22 images; harmless on newer Node where sqlite is unflagged
ENV NODE_OPTIONS=--experimental-sqlite

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/starter.db ./starter.db
COPY docker-entrypoint.dist.sh ./docker-entrypoint.sh
# Strip CRLF if the file was edited/copied from Windows (else: exec … no such file or directory)
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

RUN test -f server.js
RUN node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(':memory:'); db.prepare('select 1').get(); db.close();"

EXPOSE 80
ENTRYPOINT ["/app/docker-entrypoint.sh"]