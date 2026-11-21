# GBPI Legal Contract Ops MVP — Live Demo QA Readiness

**Audience:** Senior paralegal live demo (DSSI pilot)  
**App:** `company-workspace/gardenia-legal-pilot/app`  
**Assessed:** 2026-11-21  
**QA recommendation:** **CONDITIONAL GO** (see blockers)

---

## Executive summary

The **README demo script (10 steps)** is implementable in code and seed data: intake → pool → matter detail → LEG-FORM-5 print view → print gate → requester timeline → manager expiry/search. **Production build passes** (`npm run build`). **Core rules verified in code/runtime:** status machine, print gate (AC-R2), dept-scoped requester ACL (AC-B2 partial), near-expiry seed (`GBPI-2026-0003`), missing end date flag (`GBPI-2025-0050`).

**Demo blocker found at assessment time:** An already-running **dev server on :3000** served **HTTP 500** (`Cannot find module './887.js'`) after a concurrent `next build` left a **corrupted `.next`**. Clean rebuild + `next start` on :3002 returned **200** on all script-critical routes. **Do not demo until the server is restarted from a clean `.next`.**

---

## Evidence — build & runtime

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run build` | **PASS** | Compiled; 16 routes; 3 ESLint warnings only |
| `npm run lint` | **PASS** (warnings) | 3 unused-var warnings |
| Automated tests | **N/A** | No `*.test.ts` / `*.spec.ts` in app |
| `:3000` dev (pre-fix) | **FAIL** | Multiple routes HTTP 500; `__NEXT_DATA__` message: `Cannot find module './887.js'` |
| `:3002` prod (clean build) | **PASS** | See HTTP matrix below |

### HTTP smoke (clean `rm -rf .next && npm run build && PORT=3002 npm start`)

Session cookie: `gbpi_session_user_id=<uuid>` from SQLite `data/gardenia.db`.

| Route | Role | HTTP | Notes |
| --- | --- | --- | --- |
| `/login` | — | 200 | Demo accounts listed |
| `/legal/pool` | assigner | 200 | Pool UI; seeded `GBPI-2026-0001` claimable |
| `/legal/pool` | requester | 307 → `/403` | Expected |
| `/request/<MKTG matter>` | requester (Purchasing) | 307 → `/403` | Marketing matter blocked (AC-B2) |
| `/manager/portfolio` | manager | 200 | |
| `/manager/expiry?bucket=NearExpiry` | manager | 200 | Contains `GBPI-2026-0003`, Filinvest |
| `/legal/matters?q=Filinvest` | assigner | 200 | |
| `/legal/matters/<LEASE>/routing-slip` | assigner | 200 | LEG-FORM-5 layout |
| `/api/config/features` | — | 200 | `{"digitalRoutingSlipEnabled":false,"aiEnabled":true}` |

Content markers (HTML grep): Brand ambassador matter shows `missing_expiry` + `Expiry risk flags`; Near expiry tab shows `GBPI-2026-0003`.

---

## Evidence — core logic (code review + tsx)

### Status machine (`src/lib/matters/status-machine.ts`)

- Full status list matches product brief A2.
- `Drafting` → `Internal Review` removed from `allowedTransitions` when `printedCopyIssued` is false.
- `canTransition` returns explicit error: *"Cannot advance to Internal Review until printed copy is issued..."*

**Runtime (tsx):**

- `Drafting → Internal Review` + `printed=false` → `ok: false`
- `Drafting → Internal Review` + `printed=true` → `ok: true`
- `Submitted → Final Approval` → `ok: false`

**Illegal transition + audit (tsx on `GBPI-2026-0002` Drafting, no print):** throws before DB update; audit count **unchanged** (AC-A3).

### Print gate (AC-R2)

- **UI:** `MatterDetailView` banner when Drafting and no `printedCopyIssuedAt`.
- **Server:** `transitionStatus` uses `canTransition` with `printedCopyIssued: !!matter.printedCopyIssuedAt`.
- **Record milestone:** `recordPrintedCopy` sets `printed_copy_issued_at` + `routing_print` audit event.

### ACL (`src/lib/matters/acl.ts`)

- Requester: `matter.departmentId === user.departmentId`.
- Legal / assigner / manager / admin: read all matters in DB (pilot assumption).
- **tsx:** requester cannot read `GBPI-2026-0002` (Marketing); can read `GBPI-2026-0003` (Purchasing).

### Seed (`scripts/seed.ts`)

| Demo README reference | Verified in DB |
| --- | --- |
| `GBPI-2026-0003` Filinvest lease | `status=Assigned`, `expiry_bucket=NearExpiry`, end ~25 days out |
| Brand ambassador | `GBPI-2025-0050`, `effectivity_end` null, `expiry_bucket=Unknown` |
| Pool item | 1 matter `In Pool` (`GBPI-2026-0001`) |
| Demo users | 4 users including assigner labeled Sr. Paralegal |

---

## Demo script traceability (README 10 steps)

| Step | Ready? | Notes |
| --- | --- | --- |
| 1 Requester intake | **Yes** | Form + matter number; email → **console stub** (`sendEmailStub`) |
| 2 Assigner claim pool | **Yes** | After server restart |
| 3 Drafting + custody + GDoc | **Yes** | Server actions |
| 4 Print routing + record issued | **Yes** | HTML print page + `window.print()`; not PDF file |
| 5 Internal Review blocked/skippable | **Yes** | Gate enforced server + client transition list |
| 6 Requester timeline + AI | **Yes** | Deterministic summary without `OPENAI_API_KEY` |
| 7 Manager portfolio + expiry | **Yes** | NearExpiry tab |
| 8 Search Filinvest / In Pool | **Yes** | Query param search |
| 9 Seeded lease / brand flags | **Yes** | UI flags + expiry bucket |
| 10 Optional live LLM | **Optional** | Template path works offline |

**AC-P3 (script ≤25 min):** **PASS** assuming stable server and facilitator knows email is console-only.

---

## Acceptance criteria — demo vs product brief

### Pass / partial (demo-relevant)

| ID | Status | Notes |
| --- | --- | --- |
| AC-A2 | **Pass** | In Pool on submit; claim/assign in pool |
| AC-A3 | **Pass** | Illegal transitions blocked; no audit on failure (sampled) |
| AC-A4 | **Pass** | Requester matter view + timeline |
| AC-A5 | **Pass** | Custody updates audited (`updateCustody` → `custody_change`) |
| AC-B1 | **Partial** | Metadata + GDoc/artifact links; no file upload pipeline |
| AC-B2 | **Partial** | Dept isolation for requesters; no entity-level legal scoping |
| AC-B3 | **Partial** | Near expiry list UI; **no weekly digest job** |
| AC-B4 | **Pass** (pilot size) | Substring search on title/counterparty/matter # |
| AC-AI1 | **Partial** | Deterministic summary + LLM guardrail prompt; manual n=10 not run |
| AC-AI2 | **Pass** | `missing_expiry` in UI for brand ambassador seed |
| AC-AI4 | **Pass** (visual) | Routing slip fields from matter/intake metadata |
| AC-R1 | **Partial** | Print-friendly HTML; wet-ink lines; **not PDF download** |
| AC-R2 | **Pass** | Print gate enforced |
| AC-R3 | **N/A** | Flag off; no digital approval capture |

### Fail / not implemented (call out if paralegal asks “full pilot scope”)

| ID | Status | Gap |
| --- | --- | --- |
| AC-A1 | **Fail** | No PDF/DOCX attachment upload; email not SMTP (console stub only) |
| AC-B5 | **Fail** | No CSV/XLSX import wizard |
| AC-B4 (digest) | **Fail** | No scheduled email digest / 90-30-7 alerts |
| AC-AI3 | **Fail** | No natural-language search assist |
| AC-AI5 | **Fail** | No clause/risk highlight on upload |
| AC-P1 / AC-P2 | **Out of demo** | Champion sign-off form / gap memo not in app |

---

## QA plan (executed)

### Scope under test

Live demo path for senior paralegal per `app/README.md`, aligned to product-brief **must-have** slices A, B (thin), R, light AI — **demo depth only**.

### Scenarios

| ID | Type | Steps | Expected | Result |
| --- | --- | --- | --- | --- |
| S1 | Happy | Requester login → New request → submit | Matter # assigned; In Pool; stub email in terminal | Code path OK; not E2E in browser |
| S2 | Happy | Assigner → Pool → Claim → open matter | Assigned; audit events | Pool 200 (prod smoke) |
| S3 | Happy | Drafting → record print → Internal Review | Gate blocks until print recorded | tsx + code PASS |
| S4 | Happy | Manager → Expiry NearExpiry | `GBPI-2026-0003` listed | HTML PASS |
| S5 | Happy | Search `Filinvest` | Lease matter in results | HTTP 200 |
| S6 | Negative | Requester opens other-dept matter | 403 | 307 → `/403` PASS |
| S7 | Negative | Drafting → Internal Review without print | Error message; status unchanged | tsx PASS |
| S8 | Build | `npm run build` | Green | PASS |

### Edge & failure cases

- **Corrupted `.next` while dev running:** 500 on most pages — **treat as P0 demo risk**; fix = stop server, `rm -rf .next`, `npm run dev` (or `build && start`).
- **Reseed during demo:** `npm run db:seed` **wipes** matters/users; run only before session, not mid-demo.
- **Single requester account:** Cannot live-demo AC-B2 with two dept requesters without seed change.
- **No automated regression:** Status/ACL changes are manual re-check risks.

### Quality gates

| Gate | Required | Status |
| --- | --- | --- |
| `npm run build` | Yes | **Green** |
| Critical routes 200 (assigner pool, matter, routing, manager expiry) | Yes | **Green** on clean prod (:3002) |
| Print gate enforced server-side | Yes | **Green** |
| Demo seed matters present | Yes | **Green** |
| :3000 dev healthy without restart | Yes | **Red** at assessment (500) |
| Full product-brief AC set | No (demo) | **Red** on A1 email/attachments, B5, B4 digest, AI3, AI5 |

### Manual vs automated

| Area | Manual | Automated |
| --- | --- | --- |
| Demo script walkthrough | **Required** 15-min dry run in browser | — |
| Status / expiry logic | — | tsx one-liners (done) |
| ACL | Cookie HTTP checks (done) | tsx unit-style (done) |
| UI print layout | Visual on paper/PDF print dialog | — |

### Severity rubric

- **Critical:** Demo cannot proceed (app 500, seed missing, print gate bypass).
- **Major:** Scripted step fails or misleads stakeholder (email claimed as real SMTP).
- **Minor:** ESLint warnings, non-PDF routing slip, out-of-scope features missing.

---

## Top risks (ranked)

1. **CRITICAL — Stale/corrupt `.next` on :3000** → widespread 500 until restart (observed).
2. **MAJOR — Email narrative:** UI/copy implies receipt email; only **stdout stub** — facilitator must show terminal or rephrase.
3. **MAJOR — Scope expectation:** Paralegal may expect Excel import, attachments, digest alerts (brief ACs) — **not in MVP**.
4. **MINOR — Routing slip is HTML print, not PDF** — still demoable with browser print.
5. **MINOR — No automated tests** — regressions possible under last-minute edits.
6. **MINOR — Parent repo lockfile warning** — may affect production deploy tracing (not local demo if using `dev`).

---

## 5-minute fix list (before live demo)

1. **Stop** any running `next dev` / `next start` on :3000.
2. **`rm -rf .next`** in `app/`, then **`npm run dev`** (or `npm run build && npm start`).
3. Confirm **`http://localhost:3000/login`** returns **200** and assigner **Assignment pool** loads.
4. If data was touched during QA: **`npm run db:seed`** once (reprints demo users/matter IDs in console — **re-login** after).
5. Open a **second terminal** tab for **`[EMAIL STUB]`** logs during intake/status steps.

Optional (not required for go): set `outputFileTracingRoot` in `next.config.ts` to silence lockfile warning.

---

## Go / no-go

| Decision | **CONDITIONAL GO** |
| --- | --- |
| Blockers | **Restart server from clean `.next`** (observed :3000 broken at QA time) |
| Dry run | **5–10 min browser walk** of README steps 1–9 after restart |
| Messaging | Position as **thin ops pilot** — not full CLM; email/import/digest deferred |

**NO-GO** if assigner cannot load `/legal/pool` or print gate can be bypassed (not observed on clean build).

---

## Decisions for CEO

| Topic | Recommendation |
| --- | --- |
| Demo vs full AC | Use **README script** as demo contract; defer B5/B4/AI3/AI5 in Q&A |
| Email | Say **“pilot logs notifications locally”** unless SMTP wired before demo |
| Hosting | Local machine demo per README; ensure single clean server process |
| Champion metric | AC-P1 sign-off still **offline** after demo |

---

## Appendix — commands used

```bash
cd company-workspace/gardenia-legal-pilot/app
npm run build
npm run lint
rm -rf .next && npm run build && PORT=3002 npm start
sqlite3 data/gardenia.db "SELECT matter_number, status, expiry_bucket FROM matters WHERE matter_number LIKE 'GBPI-2026-0003';"
```

**Files reviewed:** `README.md`, `product-brief.md`, `status-machine.ts`, `acl.ts`, `service.ts`, `seed.ts`, `routing-slip/page.tsx`, `MatterDetailView.tsx`, `MatterEditor.tsx`, `expiry.ts`, `summary.ts`.