# Deploy JPA AP/AR Tracker (`/dev/ap-tracker/`)

Production UI is built for **https://\<host\>/dev/ap-tracker/** behind nginx. The Node app still listens on container port **8080** (host **8067** by default) at `/` and `/api`; nginx strips the `/dev/ap-tracker` prefix.

## 1. Build on your machine (Windows)

From `jpa-ap-tracker` (default Vite base is already `/dev/ap-tracker/`):

```powershell
# Do NOT set BASE_PATH=/ — that is for local root-only Docker.
# Preserve dist/.env (Telegram/OpenAI keys) across clean:
if (Test-Path dist\.env) { Copy-Item -Force dist\.env .env.dist.bak }
npm run build
if (Test-Path .env.dist.bak) { Copy-Item -Force .env.dist.bak dist\.env; Remove-Item .env.dist.bak }
```

Confirm `dist/public/index.html` references `/dev/ap-tracker/assets/...`.

Ensure project-root `.env` on the **server** has at least:

- `DB_PASSWORD=...` (must match the Postgres volume password already in use)
- `APP_PORT=8067` (or your chosen host port)
- `TELEGRAM_WEBHOOK_BASE_URL=https://ds-solutionsinc.com/dev/ap-tracker` (no trailing slash issues for webhook path)
- Optional: `OPENAI_*`, Telegram bot token/secret

`dist/.env` is what the app container loads via `--env-file=.env` (keys like OPENAI / TELEGRAM). Compose also injects `DATABASE_URL` from `DB_PASSWORD`.

## 2. Copy to the server

Copy at least:

- `docker-compose.yml`
- `dist/` (entire folder, including `dist/.env`, `migrations`, `public`, `server`)
- `.env` (for Compose variable substitution: `DB_PASSWORD`, `APP_PORT`)

Do **not** run `docker compose down -v` on the server (that deletes `pgdata` / `uploads`).

Example layout on server:

```text
/opt/jpa-ap-tracker/
  docker-compose.yml
  .env
  dist/
```

## 3. Start / update containers

```bash
cd /opt/jpa-ap-tracker   # or your path
docker compose up -d
# After a new dist copy:
docker compose up -d --force-recreate app
```

Migrations run on app start (includes 035–038 PDC / shared-batch, etc.).

Health: `curl -s http://127.0.0.1:8067/api/health` → `{"ok":true}`

## 4. Nginx (strip prefix)

```nginx
location /dev/ap-tracker/ {
    proxy_pass http://127.0.0.1:8067/;   # trailing slash STRIPS /dev/ap-tracker
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25m;
}
```

Reload nginx. Open: `https://ds-solutionsinc.com/dev/ap-tracker/`

## 5. Local Docker note

Local root testing used `BASE_PATH=/`. For server builds, always use default `npm run build` (`/dev/ap-tracker/`). Mixing the two in the same `dist` causes white page / wrong asset MIME errors.
