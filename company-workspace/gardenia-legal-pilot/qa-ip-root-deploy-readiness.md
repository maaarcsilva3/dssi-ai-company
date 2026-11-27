# QA readiness: Gardenia Legal Pilot — IP-root server smoke

**Review date:** 2025-11-27  
**Reviewer:** QA (static artifact review)  
**Machine:** Windows prep host — **Docker Compose not executed here** (per CEO brief).

## Executive summary

Configuration for the temporary **IP-root** profile (`NEXT_PUBLIC_BASE_PATH` empty at build, `COOKIE_PATH=/`, `8094:80`, server-side `docker compose up --build -d`) is **internally consistent** across compose, Dockerfile, `next.config.ts`, entrypoint, and session cookies. Flip-back overlay (`docker-compose.nginx-subpath.yml`) is present and aligned with README.

**Recommendation:** **CONDITIONAL GO** — CEO may copy the source tree and run the documented server commands, but **smoke is not proven** until mandatory server gates below all pass. Do not declare deploy success until gate G1–G6 are green.

---

## Scope under test

| In scope | Out of scope (this pass) |
| --- | --- |
| Default `docker-compose.yml` IP-root build/run | Host nginx / HTTPS / `ds-solutionsinc.com` subpath |
| Login/session at `http://<public-ip>:8094/` | `docker-compose.dist-run.yml` (legacy; not CEO default path) |
| Port **8094** published to host | CI/CD, production SSO, secrets management |
| Copy-from-Windows → build-on-Linux server | Runtime verification on 193.203.161.251 (not run from QA machine) |

---

## CEO acceptance criteria

| ID | Criterion | Static review | Runtime (server) | Verdict |
| --- | --- | --- | --- | --- |
| AC1 | `docker compose up --build -d` builds `./app` **on server** | `docker-compose.yml` sets `build.context: ./app`, multi-stage `app/Dockerfile` with `npm ci`, `npm run build`, `db:setup`/`db:seed` | Not run on this machine | **PASS (config)** / **BLOCKED (proof)** |
| AC2 | App reachable at `http://193.203.161.251:8094/` | `ports: "8094:80"`, `HOSTNAME: 0.0.0.0` | Depends on server firewall/Docker | **BLOCKED** |
| AC3 | Login works from public IP (demo accounts) | `COOKIE_PATH: /` in compose; `resolveCookiePath()` honors env; no `secure` cookie (HTTP-safe); login sets session then `redirect("/")` | Cookie + redirect not verified externally | **PASS (config)** / **BLOCKED (proof)** |
| AC4 | Port **8094**, no nginx/HTTPS in compose | No nginx service; single app service | N/A | **PASS** |
| AC5 | Temporary IP-root; flip-back documented | `docker-compose.nginx-subpath.yml` + README merge command | Flip-back not exercised | **PASS (docs)** |
| AC6 | Do not rely on Windows-built `dist/` | README excludes `dist/`; default path is compose build | N/A | **PASS** |

**Legend:** **PASS** = artifact supports criterion; **BLOCKED** = requires server execution; **FAIL** = defect found (none in static review).

---

## Critical risks (ranked)

1. **No end-to-end proof** — Compose build, container health, and public login were **not** validated on Linux or against `193.203.161.251` from this review.
2. **Public demo auth** — Login is pick-a-user with **no password** (`login/page.tsx`). Acceptable for pilot smoke; **unacceptable** if treated as production on a public IP.
3. **Cleartext HTTP** — Session cookie is `httpOnly` + `sameSite: lax` without `secure`; correct for HTTP smoke, but session hijack on untrusted networks is possible.
4. **Operational dependencies** — Server needs Docker + Compose v2, enough disk/RAM for Node 20 build, and **host firewall** allowing **8094/tcp** (not defined in repo).
5. **Port collision** — Another stack on the same host using **8094** will block bind (README notes JPA on **8093**; Gardenia on **8094**).
6. **First-build fragility** — Image build installs `python3 make g++` for `better-sqlite3`; slow or failing builds on constrained servers delay smoke.
7. **Persistent volume state** — Named volume `gardenia-legal-pilot-data`; empty/corrupt DB handled on first boot via entrypoint copy from `starter.db`, but `docker compose down -v` is required for a clean re-seed (documented).
8. **Wrong compose file** — Using `docker-compose.dist-run.yml` without Linux `./dist` will fail; CEO path must stay on default `docker-compose.yml`.

---

## Server quality gates (fail-closed)

All must pass before calling the smoke **PASS**. Any failure = **stop** and fix before CEO sign-off.

| Gate | Command / check | Pass condition |
| --- | --- | --- |
| **G1** | `cd /path/to/gardenia-legal-pilot && docker compose up --build -d` | Exit 0; image `gardenia-legal-pilot:local` built; container `gardenia-legal-pilot` **running** |
| **G2** | `docker compose logs gardenia-legal-pilot` (tail) | No crash loop; `node server.js` listening; optional “First boot: copying starter.db” once |
| **G3** | On server: `curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:8094/` | `200` or `307` to login (not `000`/connection refused) |
| **G4** | On server: `curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:8094/login` | `200` |
| **G5** | From CEO workstation: open `http://193.203.161.251:8094/login` | Page loads; demo users listed |
| **G6** | Public login smoke | Select e.g. `requester@gbpi.demo`; land on authenticated home; **DevTools → Application → Cookies**: `gbpi_session_user_id` with **Path=/** |
| **G7** (optional) | `docker compose ps` | Published `0.0.0.0:8094->80/tcp` |

---

## Manual vs automated

| Area | This review | On server (CEO/ops) |
| --- | --- | --- |
| Compose build/run | Not run (Windows, no Docker requirement) | G1–G2 |
| HTTP/login | Code + config inspection | G3–G6 |
| Flip-back profile | File parity check only | Future: merge overlay + nginx smoke per README |

No automated tests were added or executed for this deploy pass.

---

## Severity rubric (if gates fail)

| Severity | Example |
| --- | --- |
| **Critical** | Container won’t start; public URL unreachable; login sets no cookie or wrong `Path` |
| **Major** | Home loads but post-login redirect broken; DB empty (no users on login page) |
| **Minor** | Slow first build; non-blocking log warnings |

---

## Artifact cross-check (static)

| File | IP-root expectation | Observation |
| --- | --- | --- |
| `docker-compose.yml` | `8094:80`, `COOKIE_PATH=/`, `NEXT_PUBLIC_BASE_PATH: ""` build arg | Matches |
| `docker-compose.nginx-subpath.yml` | Subpath build arg + cookie path overlay | Matches README flip-back |
| `docker-compose.dist-run.yml` | Legacy run-only, `COOKIE_PATH=/` | Present; not default CEO path |
| `app/Dockerfile` | Standalone output, seed DB at build, entrypoint | Matches |
| `app/docker-entrypoint.dist.sh` | Copy `starter.db` when volume DB missing/empty | Matches |
| `app/next.config.ts` | Empty base path → no `basePath` | Matches |
| `app/src/lib/auth/session.ts` | `COOKIE_PATH` overrides default `/` | Matches compose |
| `README.md` | Copy tree, server build, smoke URLs, demo accounts | Matches |

---

## Residual gaps

- Public smoke and firewall rules on `193.203.161.251` unverified.
- No healthcheck in compose (rely on process + curl gates).
- AI features enabled (`AI_ENABLED: "true"`) without API key in compose — confirm no user-facing failure if provider unset (out of IP-root deploy scope unless smoke hits AI routes).
- Flip-back to `/dev/gardenia-legal-pilot` requires **rebuild** and host nginx — not part of this go/no-go.

---

## Go / no-go

| Decision | Rationale |
| --- | --- |
| **CONDITIONAL GO** for “CEO may copy project and run `docker compose up --build -d` on server” | Static readiness **PASS**; profile wiring correct; README command path clear. |
| **NO-GO** for “deploy succeeded / login verified” until **G1–G6** pass on the server | No Compose execution on this review machine; public URL not tested. |

---

## Decisions for CEO

1. Confirm **8094/tcp** open on server firewall/security group before smoke.
2. Treat public URL as **demo-only** until auth hardening or VPN/nginx restriction.
3. After green gates, schedule flip-back rebuild when moving to `https://ds-solutionsinc.com/dev/gardenia-legal-pilot/`.