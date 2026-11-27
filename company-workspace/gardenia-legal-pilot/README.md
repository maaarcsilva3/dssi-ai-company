# Gardenia Legal Pilot — deploy

**Active profile (temporary):** IP-root on host port **8094** — no nginx, no HTTPS  
**Public smoke URL:** [http://193.203.161.251:8094/](http://193.203.161.251:8094/)  
**Later profile:** `/dev/gardenia-legal-pilot` behind host nginx → `https://ds-solutionsinc.com/dev/gardenia-legal-pilot/` (deferred)

| Profile | `NEXT_PUBLIC_BASE_PATH` (build) | `COOKIE_PATH` (runtime) | Compose |
| --- | --- | --- | --- |
| **IP-root (default)** | empty | `/` | `docker compose up --build -d` |
| **Nginx subpath (flip-back)** | `/dev/gardenia-legal-pilot` | `/dev/gardenia-legal-pilot` | merge `docker-compose.nginx-subpath.yml` (rebuild required) |

Demo auth only — no production SSO, HTTPS termination in compose, or CI/CD in this bundle.

---

## CEO path: copy from Windows → build on Linux server

Docker is **not** required on the Windows prep machine. The server builds the image (Node 22+, built-in `node:sqlite`, Next standalone). **No native SQLite addon** (`better-sqlite3` removed).

`app/starter.db` is a **portable SQLite** demo database (schema + seed). It is copied into the image at build time. Docker **does not** run `db:setup` / `db:seed` inside the image build — refresh `starter.db` on the host via `scripts/build-starter-db.*` when schema/seed changes. The committed `app/starter.db` remains valid across drivers (standard SQLite file format).

**Runtime requires Node.js 22.5+** (for `node:sqlite` / `DatabaseSync`).

After you change `app/Dockerfile`, entrypoint, or compose on Windows, **re-tar/rsync and run `docker compose up --build -d` on the server** (rebuild is required; `up` alone reuses the old image).

### 1. Copy to server

Rsync/scp the **source tree** (not `dist/`). Example from your workstation:

```bash
rsync -av --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude dist \
  --exclude data \
  --exclude .env \
  --exclude .env.* \
  gardenia-legal-pilot/ \
  user@193.203.161.251:/path/to/gardenia-legal-pilot/
```

**Include at minimum:**

| Path | Why |
| --- | --- |
| `docker-compose.yml` | IP-root defaults (`8094:80`, `COOKIE_PATH=/`) |
| `docker-compose.nginx-subpath.yml` | Flip-back overlay (optional on server until needed) |
| `app/` | Next source, `Dockerfile`, entrypoints, **`starter.db`** |
| `scripts/` | `build-starter-db.sh` / `.ps1` (refresh seed DB); optional `build-dist.sh` |
| `README.md` | This file |

**Do not rely on** a prebuilt `dist/` from Windows — `dist/` is gitignored and native modules are platform-specific.

### 2. (Optional) Regenerate `starter.db` on server

Only if `app/starter.db` is missing from your bundle (compose build will fail with a clear error):

```bash
cd /path/to/gardenia-legal-pilot
chmod +x scripts/build-starter-db.sh
./scripts/build-starter-db.sh
```

Requires **Node 22.5+** and `npm` on the host (no Docker). On Windows before tar/scp:

```powershell
cd gardenia-legal-pilot
.\scripts\build-starter-db.ps1
```

### 3. Start on server

```bash
cd /path/to/gardenia-legal-pilot
docker compose up --build -d
```

First `up --build` compiles the app inside Docker and bakes in `starter.db`. On **first boot**, the entrypoint copies it into the SQLite volume when `/data/gardenia.db` is missing or empty.

Logs: `docker compose logs -f gardenia-legal-pilot`  
On healthy boot you should see `Preflight: SQLite OK` before `Ready` from Next.js.  
Reset demo DB: `docker compose down -v` then `docker compose up --build -d`

### 4. Smoke (IP-root)

| Check | URL |
| --- | --- |
| Home | [http://193.203.161.251:8094/](http://193.203.161.251:8094/) |
| Login | [http://193.203.161.251:8094/login](http://193.203.161.251:8094/login) |
| Loopback on server | `http://127.0.0.1:8094/` and `/login` |

Log in with a demo account (below). Session cookies use `Path=/` (`COOKIE_PATH` in compose).

---

## Flip-back to nginx subpath (later)

When restoring the public path on `ds-solutionsinc.com`:

```bash
docker compose down
docker compose -f docker-compose.yml -f docker-compose.nginx-subpath.yml up --build -d
```

That rebuilds with `NEXT_PUBLIC_BASE_PATH=/dev/gardenia-legal-pilot` and sets `COOKIE_PATH=/dev/gardenia-legal-pilot`.

Apply host nginx on the server (unchanged intent):

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

Gardenia uses Next.js `basePath` in the subpath profile, so **do not** use a trailing slash on `proxy_pass` (contrast JPA on 8093).

Smoke (subpath profile):

- `http://127.0.0.1:8094/dev/gardenia-legal-pilot/`
- `http://127.0.0.1:8094/dev/gardenia-legal-pilot/login`

---

## Legacy: prebuilt `dist/` + run-only compose

If a Linux machine already produced `./dist/` via `scripts/build-dist.sh`:

```bash
docker compose -f docker-compose.dist-run.yml up -d
```

For IP-root dist exports: `NEXT_PUBLIC_BASE_PATH= ./scripts/build-dist.sh` and set `COOKIE_PATH=/` in `docker-compose.dist-run.yml` (already default) before `up`.

---

## Build Linux `dist/` (optional; machine with Docker)

```bash
chmod +x scripts/build-dist.sh
./scripts/build-dist.sh                                    # subpath default
NEXT_PUBLIC_BASE_PATH= ./scripts/build-dist.sh             # IP-root dist
```

Exports to `./dist/` via `app/Dockerfile.dist`; `starter.db` is built on the Docker host after export.

---

## Local app development (source in `app/`)

```bash
cd app
npm install
npm run db:setup
npm run db:seed
npm run dev
```

**IP-root parity (matches server default):** open [http://localhost:3000/](http://localhost:3000/) — no base path env needed.

**Subpath parity (nginx flip-back):**

```bash
# PowerShell
$env:NEXT_PUBLIC_BASE_PATH="/dev/gardenia-legal-pilot"; npm run dev
```

Open [http://localhost:3000/dev/gardenia-legal-pilot/](http://localhost:3000/dev/gardenia-legal-pilot/).

`npm run build` on Windows is for TS/layout checks only — not for shipping Linux runtime artifacts.

---

## Demo accounts

| Email | Role |
| --- | --- |
| `requester@gbpi.demo` | requester |
| `atty.jp@gbpi.demo` | legal |
| `assigner@gbpi.demo` | assigner |
| `manager@gbpi.demo` | manager |

---

## Layout

| Path | Purpose |
| --- | --- |
| `docker-compose.yml` | **Default:** server `build` + run, IP-root, port `8094` |
| `docker-compose.nginx-subpath.yml` | Flip-back build args + `COOKIE_PATH` |
| `docker-compose.dist-run.yml` | Legacy run-only with `./dist` mount |
| `app/Dockerfile` | Server build + run (standalone; COPY `starter.db`) |
| `app/starter.db` | Portable demo SQLite (shipped in deploy bundle) |
| `scripts/build-starter-db.*` | Regenerate `starter.db` on host (not inside Docker) |
| `app/Dockerfile.dist` | Export-only image → `./dist` |
| `scripts/build-dist.sh` | Linux Docker export → `./dist` |
| `app/` | Next.js source |

No `OPENAI_API_KEY` in compose. SQLite: named volume `gardenia-legal-pilot-data`.

See `app/README.md` for demo script.