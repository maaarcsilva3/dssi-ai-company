## Objective

Prepare Gardenia Legal Pilot so it can be copied to the server and tested at http://193.203.161.251:8094/ (port 8094, no nginx/HTTPS), with a temporary IP-root profile that can flip back to /dev/gardenia-legal-pilot later. Docker is unavailable on the Windows prep machine; the Linux server builds the image.

## What we did

- **Engineer:** Switched default deploy to IP-root (empty Next `basePath`, `COOKIE_PATH=/`). Added `app/Dockerfile` so the server runs `docker compose up --build -d` from source. Added flip-back overlay `docker-compose.nginx-subpath.yml` and preserved legacy dist-run compose. Updated README with rsync + smoke URLs.
- **QA:** Artifact review only (no Docker on this machine). **CONDITIONAL GO** to copy/run; public login success not claimed until server gates pass. Report: `gardenia-legal-pilot/qa-ip-root-deploy-readiness.md`.

## Deliverables

- Gardenia Legal — IP-root server-build deploy (`tech-plan`)
- Gardenia Legal — IP-root deploy readiness (`qa-plan`)

## Decisions needed

- None blocking for copy/run. After smoke: confirm whether to keep IP-root as default or schedule nginx flip-back.

## Next steps

1. From this machine, rsync `gardenia-legal-pilot/` to the server (exclude `node_modules`, `.next`, `dist`, local `data`).
2. On server: `cd …/gardenia-legal-pilot && docker compose up --build -d` (first build is slow).
3. Smoke: open http://193.203.161.251:8094/login and sign in (e.g. `manager@gbpi.demo`).
