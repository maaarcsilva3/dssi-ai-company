## Objective
When **Separate payable per invoice** is on and method is PDC: two modes — (A) 1+ PDC per invoice, (B) one PDC for all invoices (UI outside invoices; inline disabled). N separate payables. No poteto-mode. Rebuild Docker.

## What we did
- **Engineer:** Create-form radios + mode B outside block; batch payload stamps shared check / per-invoice schedules; batch server uses fueled invoice `pdc_lines`; proof script; Docker rebuild.

## Deliverables
| Title | Path |
|-------|------|
| Separate batch PDC modes | `jpa-ap-tracker/tech-notes-pdc-separate-batch-modes.md` |
| Proof | `scripts/prove-pdc-separate-batch.mjs` |

### How to use
1. Hard-refresh http://127.0.0.1:8080/
2. New payable → Post Dated Check → **Separate payable per invoice**
3. Choose **PDC per invoice** or **One PDC for all invoices**
4. Mode B: enter check no/date above the invoice list (amount = sum of nets); no PDC under rows
5. Save/submit → N payables created

### Verified
81 tests; batch proof A+B; app healthy on :8080.

## Decisions needed
None. Mode B is not a cross-payable DB link — same check no/date on each payable with per-invoice amounts.

## Next steps
Smoke create with Separate + One PDC for all (3 invoices), confirm three payables share the check number.
