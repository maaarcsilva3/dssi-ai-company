# QA readiness — PDC draft, comma amounts, AR Due date

**Date:** 2025-11-27 · **Scope:** Code + tech notes (`tech-notes-followup-pdc-comma-due.md`); no full E2E run by QA.

## Recommendation

**Conditional GO** — automated gates green (COO); static code review supports all three CEO requirements. Run the 5‑minute CEO smoke before relying on PDC drafts or AR Due date in production.

## Gates (summary)

| Gate | Result |
|------|--------|
| `npm test` (56) | PASS (COO) |
| `npm run typecheck` | PASS (COO) |
| PDC `pdc_lines` on draft POST/PUT | PASS (code) |
| PayableFormPage load/save PDC | PASS (code) |
| `formatAmountOnBlur` / `formatMoney` (scoped surfaces) | PASS (code) |
| AR Billing lines: Due date after Receiving | PASS (code) |
| CEO manual smoke | NOT RUN |

## Top residual risks

1. No automated test for draft PDC round-trip; manual smoke is the proof.
2. Comma blur wired on listed pages only — not a full-app money-field audit.
3. Due date on billing lines is parent **summary** `due_date`, not per-line.
4. Batch create (`/batch`) does not persist `pdc_lines` (split-separate flow).

## CEO smoke

See QA chat deliverable §5‑min manual smoke script (same steps as tech-notes §Verify manually).