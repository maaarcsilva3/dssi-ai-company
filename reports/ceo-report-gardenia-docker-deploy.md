## Objective

Deploy Gardenia Legal Pilot with a JPA-like copy footprint: `docker-compose.yml` + prebuilt Linux `dist/` only (Next standalone + Node, not static nginx).

## What we did

- **Engineer:** Run-only compose (`node:20-bookworm-slim` mounts `./dist`), `scripts/build-dist.sh` + `app/Dockerfile.dist` to export Linux `dist/` (correct `better-sqlite3`), README updated for rsync + preserve-path nginx.
- Removed server-side image build requirement.

## Deliverables

- Gardenia Legal — standalone dist + run-only compose (`tech-plan`)
- On disk: `docker-compose.yml`, `scripts/build-dist.sh`, `app/Dockerfile.dist`, `README.md`

## Decisions needed

- Run `./scripts/build-dist.sh` on a machine **with Docker**, then copy to the server (this machine had no Docker daemon when we reshaped).

## Next steps

1. `./scripts/build-dist.sh` → produce `dist/`
2. Rsync `docker-compose.yml` + `dist/` to server → `docker compose up -d`
3. Apply nginx (no trailing slash on `proxy_pass`) → smoke public URL
