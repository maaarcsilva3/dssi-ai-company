## Objective
How to deploy jpa-ap-tracker to the server with path `/dev/ap-tracker/`.

## What we did
- Rebuilt `dist/` with default Vite base **`/dev/ap-tracker/`** (assets in index.html confirmed).
- Wrote `company-workspace/jpa-ap-tracker/DEPLOY.md`.

## Deploy steps (short)
1. On build machine: `npm run build` (do **not** set `BASE_PATH=/`).
2. Copy `docker-compose.yml`, `.env`, and `dist/` to the server.
3. `docker compose up -d` (or `--force-recreate app` after updating dist). Host port default **8067**.
4. Nginx `location /dev/ap-tracker/` → `proxy_pass http://127.0.0.1:8067/;` (**trailing slash** strips the prefix).
5. Open `https://ds-solutionsinc.com/dev/ap-tracker/`.

## Decisions needed
None.

## Next steps
Copy the new `dist/` + compose to the server and recreate the app container; hard-refresh the public URL.
