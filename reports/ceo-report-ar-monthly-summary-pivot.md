## Objective
Monthly Summary Excel = company × Jan–Dec **grand_total** pivot for the selected year; empty months 0.00; all companies (ignore filters); remove sales report download; no poteto; rebuild Docker.

## What we did
- **Engineer:** `GET /api/ar/summaries/year-pivot?year=YYYY`; SheetJS pivot export; removed sales report button; Docker rebuild.

## Deliverables
| Title | Path |
|-------|------|
| Pivot export | `jpa-ap-tracker/tech-notes-ar-monthly-summary-pivot.md` |

### How to use
1. Hard-refresh http://127.0.0.1:8080/
2. Receivables → Monthly summary → set any month in the target year → **Download monthly summary**
3. File: `ar-monthly-summary-YYYY.xlsx` — Company + January…December + Grand Total row

### Verified
85 tests; pivot API returns 12 months + column totals; app healthy on :8080.

## Decisions needed
None. Month bucket uses `COALESCE(coverage_start, invoice_date)` (same as on-screen monthly list).

## Next steps
Open the downloaded file once and confirm companies/months look right vs your sample layout.
