# Gardenia Legal Pilot — Docker deploy QA readiness

**Review date:** 2025-11-22  
**Scope:** Artifact + logic review on disk (`gardenia-legal-pilot/`).  
**Explicitly not claimed:** `docker compose build/up` on this machine (Docker daemon unavailable). Same limitation as JPA freight site.

**Target success:** `https://ds-solutionsinc.com/dev/gardenia-legal-pilot/` serves the demo after host nginx is applied.

---

## CEO constraints → acceptance criteria

| ID | Acceptance criterion | Result | Evidence / notes |
| --- | --- | --- | --- |
| AC-1 | Runtime is **Next.js in Docker** (standalone `node server.js`), not static nginx serving `dist/` | **Pass** | `app/Dockerfile` builder `npm run build`, runner `exec node server.js` via `docker-entrypoint.sh`. Contrast: JPA uses `nginx:alpine` + static `dist/`. |
| AC-2 | Host port **8094** maps to app | **Pass** | `docker-compose.yml`: `"8094:80"`; `PORT=80` in Dockerfile. |
| AC-3 | **SQLite volume** survives `docker compose down` (no `-v`) | **Pass** | Named volume `gardenia-legal-pilot-data` → `/data`; `DATABASE_PATH=/data/gardenia.db`. README documents retain on down. |
| AC-4 | **Seed only on first boot** when DB missing or empty | **Pass** | `docker-entrypoint.sh`: `! -f` OR `! -s` → `tsx scripts/setup.ts` + `seed.ts`; else skip. |
| AC-5 | Host nginx **preserves path prefix** for Next `basePath` (not JPA strip) | **Pass (design)** / **Blocked (runtime)** | README nginx snippet: `proxy_pass http://127.0.0.1:8094` **without** trailing slash. JPA pattern uses trailing slash to strip. **Blocked:** snippet not in repo server config; must be applied on ds-solutionsinc.com host. |
| AC-6 | `basePath` = `/dev/gardenia-legal-pilot` + standalone output | **Pass** | `next.config.ts`; build-time `NEXT_PUBLIC_BASE_PATH` in Dockerfile. |
| AC-7 | Session cookies scoped to subpath | **Pass** | `COOKIE_PATH` in compose; `session.ts` uses `path: cookiePath`. |
| AC-8 | **No OPENAI_API_KEY** in compose | **Pass** | `docker-compose.yml` env block has none; AI falls back in `summary.ts`. |
| AC-9 | No CI/CD required for this release | **Pass** | Manual compose + nginx documented. |
| AC-10 | Local **`npm run build`** succeeds | **Pass** | Per CEO verification status (not re-run in this review). |
| AC-11 | **Public URL** serves demo after nginx | **Blocked** | Requires server: `docker compose build/up` + nginx reload + HTTPS smoke. Not exercised here. |
| AC-12 | **Docker image builds and container stays healthy** | **Blocked** | No Docker daemon on review machine. **Mandatory gate on deploy host.** |

---

## Critical risks (release)

| Risk | Severity | Mitigation |
| --- | --- | --- |
| **Wrong `proxy_pass`** (trailing `/` like JPA) | **Critical** | Use exact README block: no trailing slash on upstream URL. Misconfig → 404 on `/_next/static`, broken assets, wrong routes. |
| **basePath / asset URLs** | **Major** | Build bakes `NEXT_PUBLIC_BASE_PATH`; smoke `/_next/static/*` and page HTML via public URL, not only `/`. |
| **Cookie path behind nginx** | **Major** | Confirm `Set-Cookie` `Path=/dev/gardenia-legal-pilot` on HTTPS; login must persist after redirect. |
| **better-sqlite3 native module** | **Major** | Multi-stage build compiles on `node:20-bookworm-slim` with `python3 make g++`; runner copies same `node_modules`. Fail fast if `docker compose build` errors on target arch (expect amd64 on typical VPS). |
| **First-boot seed vs volume** | **Major** | `down -v` re-seeds; accidental `-v` wipes demo data. Document for ops. Empty-but-present DB file skips seed (`-s` check). |
| **Root container** | **Moderate** | No `USER` in Dockerfile (comment: write SQLite on volume). Acceptable for isolated demo; not production hardening. |
| **tsx / devDeps in production image** | **Low** | Full `node_modules` copied for first-boot scripts; larger image, wider attack surface. Demo-only tradeoff. |
| **Ops copies JPA nginx habit** | **Critical** | README calls out contrast explicitly; verify location block in prod config before reload. |

---

## Quality gates (deploy host)

| Gate | Required |
| --- | --- |
| `docker compose build` exits 0 | Yes |
| `docker compose up -d` + container running | Yes |
| `curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:8094/dev/gardenia-legal-pilot/` → 200 (or 307 to trailing slash) | Yes |
| Login flow + session cookie on loopback | Yes |
| Nginx config applied + `nginx -t` + reload | Yes |
| Public HTTPS URL 200 + static asset load + login | Yes |
| Restart container; data still present (no re-seed log line) | Yes |

---

## Post-deploy smoke steps (ops)

Run on the server after `docker compose up -d` and **before** declaring success:

1. **Build & start** (from `gardenia-legal-pilot/`):
   - `docker compose build`
   - `docker compose up -d`
   - `docker compose logs --tail=80 gardenia-legal-pilot` — expect either “First boot: initializing SQLite” (once) or “Using existing database”.

2. **Loopback (preserves basePath):**
   - `curl -sSI http://127.0.0.1:8094/dev/gardenia-legal-pilot/ | head -5`
   - Open or curl login: `http://127.0.0.1:8094/dev/gardenia-legal-pilot/login`
   - Select demo user (e.g. `manager@gbpi.demo`); confirm redirect to role dashboard without 404.

3. **Static assets:**
   - From browser devtools or `curl`, confirm at least one `/_next/static/...` request returns 200 under the prefixed URL.

4. **Persistence:**
   - `docker compose restart gardenia-legal-pilot`
   - Logs should show “Using existing database”; same matters/users visible.

5. **Nginx:**
   - Add README `location` blocks (301 for bare path + prefixed `proxy_pass` **without** trailing slash).
   - `sudo nginx -t && sudo systemctl reload nginx` (or host-equivalent).

6. **Public:**
   - `https://ds-solutionsinc.com/dev/gardenia-legal-pilot/`
   - `https://ds-solutionsinc.com/dev/gardenia-legal-pilot/login`
   - Login + one matter detail page; optional AI summary (template mode without API key).

---

## Go / no-go

**Recommendation: CONDITIONAL GO** to deploy on the ds-solutionsinc.com host.

**Rationale:** File review aligns with all CEO constraints that can be verified without Docker/nginx runtime. Compose, Dockerfile, entrypoint seed logic, basePath, cookie path, and JPA-contrast nginx documentation are consistent. Local Next build reported PASS.

**Conditions (fail closed → NO-GO if any fail on server):**

1. `docker compose build` / `up` succeeds on the target host.
2. Loopback smoke at `:8094` with full `/dev/gardenia-legal-pilot/` prefix passes.
3. Nginx uses **non-stripping** `proxy_pass` (not JPA-style).
4. Public HTTPS smoke passes login + assets.

Do **not** mark release complete until AC-11 and AC-12 pass on the server.

---

## Residual gaps

- No automated test or CI for Docker/nginx integration.
- Production nginx config not versioned in this repo (ops manual edit).
- `AI_ENABLED=true` in compose without API key — behavior OK (templates); live LLM optional via env not in compose.
- Security: passwordless demo login, root in container, no TLS termination inside container (expected behind host nginx).
- `npm run build` not re-executed during this QA pass (relied on stated PASS).

---

## Severity rubric (for defects found in smoke)

| Level | Definition |
| --- | --- |
| Critical | Public URL down, data loss on restart, wrong nginx breaks all routes/assets |
| Major | Login/session broken, seed on every boot, build fails on server |
| Minor | Cosmetic, non-blocking log noise, optional AI path |