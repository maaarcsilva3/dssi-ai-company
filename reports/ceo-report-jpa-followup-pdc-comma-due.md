## Objective
Fix three jpa-ap-tracker issues now (no poteto-mode): retain PDC on draft edit, comma-format all money displays, add Due date after Receiving date on Receivables Billing lines; keep current Docker serving.

## What we did
- **COO:** Clarified scope; default eng path; verified tests; rebuilt Docker dist (BASE_PATH=/) and recreated healthy app on :8080.
- **Engineer:** Fixed PDC draft persist/load; added `formatAmountOnBlur` sweep; AR Billing lines Due date column.
- **QA:** Code review readiness → **CONDITIONAL GO** (manual smoke still on you).

## Deliverables
| Title | Kind | Path |
|-------|------|------|
| Implementation + tech notes | product-build | `company-workspace/jpa-ap-tracker/` + `tech-notes-followup-pdc-comma-due.md` |
| QA readiness | qa-plan | `jpa-ap-tracker/qa-followup-pdc-comma-due.md` |

### Shipped
1. **PDC draft:** Server saves `pdc_lines` on draft when sent; form loads/sends them; panel shows when stored PDC exists.
2. **Commas:** Blur formats amount inputs with thousand separators across payable/PDC/source accounts/liquidations/petty cash/AR; tables already use `formatMoney`.
3. **AR Billing lines:** Column order … Receiving date → **Due date** (MM/DD/YYYY from summary due date).

## Decisions needed
1. Confirm Billing-line **Due date** = parent monthly summary due date (not a per-line due) is correct.
2. Optional later: PDC on batch/split-separate payable create (out of this pass).

## Next steps
1. Hard-refresh http://127.0.0.1:8080/ and run the ~5 min smoke in `qa-followup-pdc-comma-due.md` (draft PDC round-trip, blur commas, Due date column).
2. If anything still clears PDC, note payment method name + whether Save Draft vs Submit.
3. Promote only after that smoke.
