# Gardenia Legal Pilot — deploy (dist + compose)

**Production base path:** `/dev/gardenia-legal-pilot`  
**Host port:** `8094` → container `PORT=80`  
**Public URL:** `https://ds-solutionsinc.com/dev/gardenia-legal-pilot/`

Same **copy pattern as JPA** (`docker-compose.yml` + bundle folder), but runtime is **Node** (`node server.js`) not nginx. On the server you only need:

```
gardenia-legal-pilot/
  docker-compose.yml
  dist/                 # Linux Next standalone (prebuilt)
  README.md             # optional
```

Then: `docker compose up -d` — **no source tree, no `docker compose build` on the server.**

SQLite lives on the named volume `gardenia-legal-pilot-data`. On **first boot**, if `/data/gardenia.db` is missing or empty, the entrypoint **copies** prebuilt `starter.db` from the mounted `dist/` (no `tsx`, no full `node_modules` on the server).

### What’s in slim `dist/`

| Included | Excluded |
| --- | --- |
| Next **standalone** (`server.js`, traced minimal `node_modules`, Linux `better-sqlite3`) | Full project `node_modules`, `tsx`, `scripts/`, `src/` |
| `.next/static`, `public` | TypeScript sources |
| `starter.db` (seeded at **build** time in Linux Docker) | — |
| `docker-entrypoint.sh` | — |

Expect ~**100MB** uncompressed (Next standalone + Linux `better-sqlite3`), not hundreds of MB from a full dependency tree. For a faster copy, pack first:

```bash
tar czf gardenia-legal-pilot-dist.tgz docker-compose.yml dist/
# upload the .tgz, then on server:
tar xzf gardenia-legal-pilot-dist.tgz && docker compose up -d
```

Rebuild `dist/` after schema/seed changes so `starter.db` stays current.

## Build Linux `dist/` (on a machine with Docker)

`better-sqlite3` is **platform-specific**. Do **not** ship a macOS `npm run build` output to Linux.

From `gardenia-legal-pilot/`:

```bash
chmod +x scripts/build-dist.sh
./scripts/build-dist.sh
```

This wipes and recreates `./dist/`:

1. **Linux Docker** (`app/Dockerfile.dist`, default `--platform linux/amd64`): `npm run build` → export Next **standalone** only.
2. **Build host**: `db:setup` + `db:seed` → `dist/starter.db` (SQLite file is portable; avoids native DB tooling inside emulated containers).

Override platform: `DIST_PLATFORM=linux/arm64 ./scripts/build-dist.sh` if the server is ARM.

**Copy to server** (example):

```bash
rsync -av --delete \
  docker-compose.yml \
  dist/ \
  README.md \
  user@server:/path/to/gardenia-legal-pilot/
```

On the server:

```bash
cd /path/to/gardenia-legal-pilot
docker compose up -d
```

Smoke (must include `basePath`):

- [http://127.0.0.1:8094/dev/gardenia-legal-pilot/](http://127.0.0.1:8094/dev/gardenia-legal-pilot/)
- [http://127.0.0.1:8094/dev/gardenia-legal-pilot/login](http://127.0.0.1:8094/dev/gardenia-legal-pilot/login)

Logs: `docker compose logs -f gardenia-legal-pilot`  
Reset demo DB: `docker compose down -v` then `up` again.

## Host nginx (ds-solutionsinc.com)

**JPA** strips the public prefix (`proxy_pass http://127.0.0.1:8093/;` with trailing slash) because static files live at container `/`.

**Gardenia** uses Next.js `basePath`, so the upstream must receive the **full** path — **no** trailing slash on `proxy_pass`:

```nginx
location = /dev/gardenia-legal-pilot {
    return 301 /dev/gardenia-legal-pilot/;
}

location /dev/gardenia-legal-pilot/ {
    proxy_pass http://127.0.0.1:8094;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Session cookies: `Path=/dev/gardenia-legal-pilot` (`COOKIE_PATH` in compose). No `OPENAI_API_KEY` in compose.

## Local app development (source in `app/`)

```bash
cd app
npm install
npm run db:setup
npm run db:seed
npm run dev
```

Open [http://localhost:3000/dev/gardenia-legal-pilot/](http://localhost:3000/dev/gardenia-legal-pilot/).

`npm run build` in `app/` is for local/dev checks on your machine only — **not** for production dist export.

## Demo accounts

| Email | Role |
| --- | --- |
| `requester@gbpi.demo` | requester |
| `atty.jp@gbpi.demo` | legal |
| `assigner@gbpi.demo` | assigner |
| `manager@gbpi.demo` | manager |

## Layout

| Path | Purpose |
| --- | --- |
| `docker-compose.yml` | Server run-only (`node:20-bookworm-slim` + volume mounts) |
| `dist/` | Slim Linux bundle: standalone + `starter.db` (gitignored) |
| `scripts/build-dist.sh` | Linux Docker export → `./dist` |
| `app/Dockerfile.dist` | Build-only image (not used on server) |
| `app/` | Next.js source |

See `app/README.md` for demo script.