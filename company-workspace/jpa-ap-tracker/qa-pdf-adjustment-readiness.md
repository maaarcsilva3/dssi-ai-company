# QA readiness — JPA PDF adjustment

**Date:** 2025-11-27  
**Method:** Code review vs `qa-pdf-adjustment-plan.md` + `tech-notes-pdf-adjustment.md`; `npm test` (56/56), `npm run typecheck` (pass). **No** live app smoke, **no** migration apply, **no** manual role/E2E script on this machine.

---

## CEO spot-check items (engineering claims)

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | `resolveCreateStatus` → **For review** | **PASS** | `ledgerDocuments.ts` staff non-draft queries `lower(name) = 'for review'` (lines 134–141). |
| 2 | `payable_status_ids` on status change | **PASS** | `assertCanSetPayableStatus` 403 when destination ∉ list (`payableStatusAccess.ts` 343–345); called on PATCH (`ledgerDocuments.ts` 1172) and bulk `POST …/set-status` (`ledgerWindow.ts` 176). Auth loads IDs from `user_payable_status_permissions` (`auth.ts` 79–80). Client `allowedPayableStatusIdsForRow` intersects workflow (`StatusChangeModal.tsx` 448–458). |
| 3 | Migration **035** + PDC sum validation | **PASS (code)** / **UNKNOWN (DB)** | `migrations/035_pdf_adjustment.sql` present (table, seeds, permissions). Server `assertPayablePdcSchedule` ±₱0.01 on create/update/PATCH (`payablePdc.ts`, `ledgerDocuments.ts` 949, 1093, 1190). Client validates on submit (`PayableFormPage.tsx` 559–563, `StatusChangeModal.tsx` 204–212). **035 not verified applied** in target database. |
| 4 | AR search / due filters + Excel | **PASS** | `ar.ts` `search`, `dueFrom`, `dueTo` on `/details` and `/summaries`; `ReceivablesBillingPage.tsx` filters + `formatDateMdY`; exports `downloadArMonthlySummary` / `downloadArSalesReport` (`arExport.ts`, header buttons in billing page). |
| 5 | Jeanette / Crissa bindings; admin = Jea | **PASS (migration script)** | `035_pdf_adjustment.sql`: Jeanette defaults/permissions on For review / Check Deposited / Released; Crissa on Create Check steps + completion; `display_name = 'Jea'` for `admin`. **Runtime assignee matrix not exercised.** |
| 6 | Out-of-scope not casually rewritten | **PASS** | PDF work centered on ledger, AR billing, format/PDC components per tech notes. No PDF-scope edits found under telegram/liquidations/petty-cash routes (those areas only appear in existing vitest files). Repo untracked in git — no commit-level diff available. |

---

## Quality gates (`qa-pdf-adjustment-plan.md`)

| Gate | Severity | Status | Notes |
|------|----------|--------|-------|
| **G1** — Staff create → **For review** | BLOCKER | **PASS (code)** | Depends on DB having status named “For review”; migration 035 does not rename statuses (already in 003/026). **Manual:** 5× Jeanette creates not run. |
| **G2** — Role matrix / 403 bypasses | BLOCKER | **PASS (code)** | Server + client gating in place. **Manual:** AP-R01–R07 matrix not run; **requires migration 035** on DB. |
| **G3** — E2E AP Jeanette→Jea→Crissa→Jeanette | BLOCKER | **FAIL (not executed)** | No manual run; cannot certify workflow/assignee handoff today. |
| **G4** — PDC integrity | BLOCKER | **PASS (code)** | Server rejects empty/mismatch; client throws on submit. **Gap:** submit button not pre-disabled on mismatch (design preferred disable); server is fail-closed. Automated test covers only `isPdcPaymentMethodName`, not sum logic. |
| **G5** — AR search / dates | HIGH | **PASS (code)** | MM/DD/YYYY + ILIKE search wired. **Manual:** AR-H01 not run. |
| **G6** — AR totals | HIGH | **PASS (code)** | `listTotals` strip in `ReceivablesBillingPage.tsx` (~543). **Manual:** not run. |
| **G7** — AR exports | HIGH | **PASS (code)** | Two buttons, filenames, empty-row placeholder row. **Manual:** row-count parity not run. |
| **G8** — Comma display | MEDIUM | **PASS (code, sample)** | `formatMoney` / `formatAmountPlain` on key surfaces; not 10-cell audit. |
| **G9** — Regression smoke (login, lists) | MEDIUM | **FAIL (not executed)** | No `npm run dev` + browser/API smoke on this pass. |
| **G10** — Scope | BLOCKER | **PASS** | No evidence of unrelated module rewrites for this adjustment. |

### Automated checks

| Check | Result |
|-------|--------|
| `npm test` | **PASS** — 8 files, 56 tests (incl. `payablePdc.test.ts` ×3) |
| `npm run typecheck` | **PASS** |

---

## Failed or incomplete gates

| Gate | Why |
|------|-----|
| **G3** | End-to-end payable workflow not executed with seeded users. |
| **G9** | No runtime smoke against a running DB. |

**Not failed but deployment-critical**

- **Migration 035** must be applied before G1/G2/G5+ mean anything in production; QA did not confirm apply on target DB.

---

## Residual risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| 035 not applied in prod/staging | Critical | Run migration; re-login users to refresh session permissions |
| Role matrix only proven in code | Major | 30–45 min manual script (Jeanette/Jea/Crissa) before customer use |
| No integration test for `assertCanSetPayableStatus` / `resolveCreateStatus` | Major | Add vitest + API fixtures post-ship |
| PDC sum validation untested in vitest | Minor | Extend `payablePdc.test.ts` |
| PDC UI allows click Save before inline disable | Minor | Server rejects; optional UX hardening |
| AR export column order vs accounting firm | Minor | Finance sample review (CEO optional waive) |
| Cross-payable “one check” bulk on PayablesPage | None today | Product assumes one-payable-multi-line / Upcoming Release bulk — unchanged |
| Sessions cached before 035 | Major | Force re-auth after migration |

---

## Verdict

**CONDITIONAL GO**

Implementation review supports engineering’s claim for all six CEO spot-checks **in code**. Blocker gates **G1, G2, G4, G10** are **PASS on implementation**; **G3** and **G9** are **FAIL (verification not done)**. **HIGH** gates are **PASS (code)** pending short manual AR spot-check.

**Upgrade to GO when:**

1. `035_pdf_adjustment.sql` applied on ship target and confirmed (permissions + `payable_pdc_lines` table).
2. Manual **G3** script completes once (deposit **or** release path).
3. Manual **G2** sample: Jeanette **403** on For review → Create Check; Jea advances one step.
4. **G9** smoke: login, payables list, AR billing page load without 500.

**NO-GO if** after migration, any cross-role status change succeeds or staff create does not land in **For review**.

---

## Quick manual script (post-migration, ~60 min)

1. `admin` / `admin123` — display **Jea**; move test payable For review → Create Check.
2. `msjeanette` — create 2-line PDC payable → For review only; denied Create Check.
3. `mscrissa` — complete Create Check step with 2 PDC lines; Jeanette completes Deposited/Released if bound.
4. AR — invoice search, export both Excel files (month with and without data).

---

*QA: code review + automated unit/typecheck only. Live certification pending steps above.*