# QA release test plan — JPA PDF adjustment

**Objective:** Validate must-have PDF alignment for AP workflow (Jeanette → Jea/admin → Crissa → Jeanette), PDC/consolidated payables, comma display, and AR search/dates/totals/exports **before or alongside** eng completion. Same-day ship; no scope expansion.

**Specs:** `product-brief-pdf-adjustment.md`, `design-brief-pdf-adjustment.md`

**Out of scope for this plan:** Telegram, liquidations, petty cash, legacy receivables customers, infra, unrelated polish.

---

## Scope under test

| Area | Surfaces | Primary risk |
|------|----------|--------------|
| AP create/default status | `PayableFormPage`, `ledgerDocuments.resolveCreateStatus` | Staff creates not landing in **For review** |
| AP workflow + roles | Status PATCH, bulk `window/set-status`, `StatusChangeModal`, seeds | Cross-role bypass, wrong assignee |
| AP multi-invoice / PDC | Invoice lines, PDC schedule, status custom fields | Net ≠ PDC sum, split payables |
| AP one check | Multi-line payable + optional Upcoming Release bulk | Wrong `payment_reference` linkage |
| AP display | Lists, modals, PDC footer | Missing comma grouping ≥₱1,000 |
| AR UX | `ReceivablesBillingPage` summary + details | Wrong dates, search, totals |
| AR exports | Client `xlsx` downloads | Row mismatch, empty month behavior |

**Test users (seed):**

| Actor | Login / role | Expected lane |
|-------|----------------|---------------|
| Jeanette | `msjeanette`, staff | Create → **For review**; complete **Check Deposited** / intermediate per binding |
| Jea | `admin`, admin | **For review** → **Create Check for Deposit/Release** |
| Crissa | `mscrissa`, staff | **Create Check** → **Check Deposited/Released** |
| AR staff | `mscrissa` + `ar_view`/`ar_edit` (or equivalent) | AR filters, exports |

---

## Acceptance criteria mapping

| Brief AC | QA IDs | Pass signal |
|----------|--------|-------------|
| AP-A consolidated + multi-PDC | AP-H01, AP-E01–E03 | ≥2 invoice lines; ≥2 PDCs; history + API |
| AP-B one check | AP-H02, AP-E04 | Shared `payment_reference`; combined total |
| AP-C workflow | AP-H03, AP-R01–R12 | Legal hops only; history `changed_by` |
| AP-D commas | AP-H04, AP-E05 | `₱1,234.56` on all display surfaces |
| Role enforcement | AP-R01–R12, AP-A01–A08 | 403 API + UI read-only/hidden |
| AR-A due/search/dates | AR-H01, AR-E01–E02 | MM/DD/YYYY; substring search |
| AR-B totals | AR-H02, AR-E03 | Count + sum match filtered rows |
| AR-C monthly summary Excel | AR-H03, AR-E04 | `.xlsx` rows = visible filtered rows |
| AR-D sales report | AR-H04, AR-E05 | Distinct filename `sales-report`; accounting columns |

---

## Scenarios

| ID | Type | Steps | Expected |
| --- | --- | --- | --- |
| AP-H01 | Happy | Jeanette: create payable, supplier X, **Post Dated Check**, 2+ invoice lines totaling **₱100,000.00**, submit (one-doc default). | Status **For review** (not draft); header/list **₱100,000.00**; `GET /api/payables/:id` has `invoices.length ≥ 2`, amount = sum. |
| AP-H02 | Happy | Jeanette: one payable, 2 invoice lines, one check no. at Crissa step; **or** AP-B path: 2 payables, Upcoming Release, same ref, bulk to Create Check. | Single `payment_reference`; both invoices visible on expand; amounts comma-formatted. |
| AP-H03 | Happy | End-to-end: Jeanette create → Jea approve to Create Check (deposit or release per method) → Crissa enter check/PDC → Jeanette final step if binding requires. | Each hop in `payable_status_history`; assignee updates per seed; terminal **Check Released** = paid when release path. |
| AP-H04 | Happy | Open payables list, form totals, status modal, upcoming release with amount ≥ ₱1,000. | All **display** amounts use grouping comma (`formatMoney` / en-PH). |
| AP-H05 | Happy | Jeanette: PDC method, add 2+ PDC rows splitting net exactly; save/submit. | Schedule persisted; list shows `n PDCs` subline if >1; status history shows PDC fields. |
| AR-H01 | Happy | AR summary: verify Due date column; billing lines: type `SI-12` (3+ chars) in invoice search. | Due **MM/DD/YYYY**; filtered rows match substring; payables dates unchanged (weekday style). |
| AR-H02 | Happy | Apply month + client filter; note summary bar and table. | `{n} invoices · Total: ₱X` where n = filtered rows, total = sum `grand_total` (summary) or line amounts (details). |
| AR-H03 | Happy | Monthly summary, ≥1 row, **Download monthly summary**. | `ar-monthly-summary-{YYYY-MM}.xlsx` downloads; opens; row count = on-screen filtered count; due dates present. |
| AR-H04 | Happy | Same filters, **Export monthly sales report**. | `ar-sales-report-{YYYY-MM}.xlsx`; columns include client, invoice, due, grand total, etc.; distinct from summary export. |
| AP-R01 | Role abuse | Jeanette: attempt **For review** → **Create Check for Deposit** (UI + `PATCH .../status` if API tool used). | **403** or destination not offered; no history row. |
| AP-R02 | Role abuse | Crissa: attempt **For review** → **Create Check** on unassigned payable. | Blocked (assignee + permission). |
| AP-R03 | Role abuse | Jeanette: attempt skip to **Check Released** from **For review**. | Blocked (`assertPayableStatusTransition`). |
| AP-R04 | Role abuse | Crissa: create new payable hoping it lands in **Create Check** without review. | Lands **For review** or create blocked unless admin. |
| AP-R05 | Role abuse | Staff user: change status on payable `assigned_to` ≠ self (non-admin). | **403**; ErrorBox assignee copy in UI. |
| AP-R06 | Role abuse | Staff with empty `payable_status_ids` vs seed with non-empty: only seeded destinations allowed. | UI intersection empty → read-only status text + tooltip. |
| AP-R07 | Role abuse | Jea (admin): transition not adjacent in workflow (e.g. 10 → 50). | Admin bypasses assignee but **not** adjacency — blocked. |
| AP-R08 | Role abuse | Unauthenticated / wrong session on status PATCH. | **401/403**; no state change. |
| AP-A01 | Role matrix | For each cell in product brief role table (wrong actor per step), repeat once. | 0 successful bypasses across matrix. |
| AP-E01 | Edge | PDC schedule: amounts sum to net **− ₱0.02** (over tolerance). | Save/Confirm disabled; danger on footer; server rejects if forced. |
| AP-E02 | Edge | PDC method selected, **0** PDC rows. | Hint; primary disabled until ≥1 row. |
| AP-E03 | Edge | PDC: remove row until 1 left; net still matches. | Allowed save. |
| AP-E04 | Edge | Upcoming Release: select 2 rows, mismatched suppliers (if UI allows). | Bulk action blocked or validation error. |
| AP-E05 | Edge | Amount exactly **₱999.99** and **₱1,000.00** on list. | Comma rule at 1k+ only for grouping policy (1,000 shows comma). |
| AR-E01 | Edge | Invoice search: empty string / whitespace only. | Full list (no erroneous filter); totals match all visible. |
| AR-E02 | Edge | Invoice search: no matches (`ZZZ-NOMATCH`). | Empty table copy; totals **0 · ₱0.00**. |
| AR-E03 | Edge | Month filter with **0** AR rows (valid month, no data). | Summary bar 0/₱0; table empty copy. |
| AR-E04 | Edge | Export monthly summary with **0** rows (design: still allowed). | `.xlsx` with headers + “No data for selected filters” (or equivalent); no crash. |
| AR-E05 | Edge | Export sales report, **0** rows. | Same empty-sheet behavior; filename still `ar-sales-report-{YYYY-MM}.xlsx`. |
| AR-E06 | Edge | Due from > due to. | No rows or validation message; no silent wrong data. |
| AP-E06 | Edge | `resolveCreateStatus` fix verification: staff create after deploy. | Never defaults to legacy “for release” name; always **For review**. |

---

## Edge & failure cases (summary)

1. **PDC sum mismatch** — Client blocks + server validation; ±₱0.01 tolerance only (AP-E01).
2. **Empty / no-match invoice search** — AR-E01, AR-E02 (totals must track filters).
3. **Export empty month** — AR-E04, AR-E05 (headers-only workbook, no JS error).
4. **403 handling** — Modal stays open; list row not optimistically updated (design).
5. **Concurrent role** — Two users: only assignee/admin can PATCH (spot-check AP-R05).
6. **Read-only AR** — User with `ar_view` only: can export if page visible (per design); cannot edit payments.

---

## Quality gates (pass/fail)

| Gate | ID | Criteria | Fail if |
|------|-----|----------|---------|
| G1 — AP workflow default | **BLOCKER** | 5/5 staff creates land in **For review** | Any create → wrong status |
| G2 — Role matrix | **BLOCKER** | 100% blocked on AP-R01–R07 + matrix | Any cross-role success |
| G3 — E2E AP script | **BLOCKER** | AP-H01→H03 completable in <10 min once | Cannot finish deposit or release path |
| G4 — PDC integrity | **BLOCKER** | AP-E01/E02 enforced | Save with mismatch or zero PDC when required |
| G5 — AR search/dates | **HIGH** | AR-H01 + AR-E01/E02 | Wrong date format or search breaks list |
| G6 — AR totals | **HIGH** | AR-H02 matches API sums | Off-by-one count or wrong total |
| G7 — AR exports | **HIGH** | AR-H03/H04 row count match (when data present) | Missing download, wrong row count |
| G8 — Comma display | **MEDIUM** | AP-H04 sample 10 cells | Any display ≥₱1k missing comma |
| G9 — Regression smoke | **MEDIUM** | Login, payables list load, AR page load | 500 on core routes |
| G10 — Scope | **BLOCKER** | No changes to out-of-scope modules | Telegram/liquidations/etc. touched |

**Release rule:** All **BLOCKER** gates green; **HIGH** gates green or waived in writing by CEO only; **MEDIUM** may ship with documented follow-up if no money/workflow impact.

---

## Manual vs automated (same-day ship)

| Layer | What | Rationale |
|-------|------|-----------|
| **Manual (required today)** | Full AP-H01–H05, AP-H03 E2E, entire role matrix AP-R01–R07 + AP-A01, AR-H01–H04, AR-E01–E05, AP-E01–E02 | Workflow + Excel + UI gating need seeded users and eyes on commas/stepper |
| **Manual smoke** | G9 on staging/local after build | Fast 15-min pass |
| **Automated (if exists / quick add)** | API: `GET /api/payables/:id` shape; `PATCH` status 403 for Jeanette→20; `GET /api/ar/details?search=` — **only if eng already has test harness** | Same-day: do **not** block ship on new suite |
| **Deferred post-ship** | Visual regression, full Excel column contract vs accounting firm, fuzzy summary search, bulk “Apply one check” if deferred | Per product “Later” / CEO B bulk decision |

**Minimum manual time budget:** ~90–120 min with 3 logins prepared.

---

## Severity rubric

| Level | Definition | Examples | Ship impact |
|-------|------------|----------|-------------|
| **Critical** | Data loss, wrong money, security bypass, cannot complete AP/AR job | Role bypass; PDC save with wrong sum; payable stuck wrong status | **No-go** |
| **Major** | Core AC broken but workaround exists | Export row off by 1; search case-sensitivity wrong; comma missing on one modal | **No-go** unless CEO waives |
| **Minor** | Cosmetic, copy, non-blocking UX | Stepper wrap on mobile; tooltip wording | Ship with ticket |
| **Trivial** | Nice-to-have polish | 150ms animation | Ship |

---

## Go / no-go

### Go (all required)

- [ ] G1, G2, G3, G4, G10 **PASS**
- [ ] G5, G6, G7 **PASS** (or CEO written waive for export column order only)
- [ ] AP-A01 matrix: **0 bypasses**
- [ ] Sample ≥5 Jeanette creates → **For review** (CEO success metric)
- [ ] Evidence captured: screenshots or HAR for one full AP path + one AR export

### No-go (any triggers stop release)

- Any **Critical** open defect
- `resolveCreateStatus` still mapping to wrong status name (blocks G1)
- `payable_status_ids` **not** enforced server-side on PATCH/window bulk (G2)
- Jeanette or Crissa can complete another role’s transition without admin
- AR exports crash or produce zero-byte files on month with data

### Conditional go

- G8 comma gaps only on blur preview line (inputs) — **Go** per ASSUMPTION
- Monthly Sales Report column order differs from accounting firm — **Go** if file opens and row count correct; finance review post-ship
- Cross-payable “Apply one check” not built — **Go** if AP-H02 single-payable multi-line path passes

---

## Decisions for CEO

| Item | QA default | Needs CEO if |
|------|------------|--------------|
| Jea = `admin` | Test as admin | Different account required |
| Bulk one-check across payables | Test only if eng ships; else AP-H02 one-doc only | v1 includes bulk bar |
| Sales report rows | Detail lines under filter (per design ASSUMPTION) | Summary-only export |
| HIGH gate waive | Not automatic | Export columns wrong but usable |

---

## Execution order (pre-release)

1. Verify seed/migration: default statuses + permissions (blocker for all AP tests).
2. G1 smoke: single Jeanette create.
3. G2 role matrix (fast API or UI).
4. AP-H01 + AP-H03 E2E (deposit **and** release if time).
5. PDC AP-E01/E02.
6. AR-H01–H04 + empty export AR-E04/E05.
7. G8 comma spot-check.
8. Record go/no-go checklist sign-off in release notes.

---

*Prepared for same-day PDF must-have; scope frozen per CEO.*