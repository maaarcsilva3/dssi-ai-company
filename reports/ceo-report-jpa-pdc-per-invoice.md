## Objective
Per-invoice PDC schedules (multi-PDC), each summing to that invoice’s net; show all values on edit; keep current create flow; rebuild Docker; poteto-mode.

## What we did
- **COO:** Locked CEO answers; enabled poteto-mode; verified API/#131/tests/Docker after implement.
- **Engineer (poteto-agent):** Migration 036, API + form redesign, proof scripts, Docker rebuild.

## Deliverables
| Title | Path |
|-------|------|
| Per-invoice PDC build | `jpa-ap-tracker/` + `tech-notes-pdc-per-invoice.md` |
| Proof script | `jpa-ap-tracker/scripts/prove-pdc-per-invoice.mjs` |

### Design choice
PDC is a child of each **invoice** (`payable_invoice_id`). Edit loads `invoices[].pdc_lines` into the panel under that invoice. This replaces the payable-level panel that raced with blank auto-seed and left edit blank even when DB had `pdc1`.

### Verified
- 66/66 tests; typecheck clean
- GET `/api/payables/131` → invoice has `pdc1` / 49107.14
- Docker app healthy on http://127.0.0.1:8080/ (migration 036 applied)

## Decisions needed
None blocking.

## Next steps
1. Hard-refresh http://127.0.0.1:8080/
2. Open payable **#131** — PDC should show under the invoice (`pdc1`).
3. New draft: 2 invoices + PDC per invoice (each schedule = that invoice net) → Save Draft → reopen → confirm both schedules.
4. Draft **#132** never got PDC rows under the old model — re-enter PDC once or recreate.
