# AR monthly summary year pivot export

## API

`GET /api/ar/summaries/year-pivot?year=YYYY`

- Auth: same as other AR routes (`ar_view` / `ar_edit` / admin).
- Ignores UI filters (client, search, due, payment, month).
- Includes only summaries with at least one `ar_detail_entries` row (same rule as monthly summary list).
- Month bucket: `date_trunc('month', COALESCE(coverage_start, invoice_date))` — matches the Receivables monthly summary month filter.
- Value per cell: `SUM(grand_total)` for that company in that calendar month.

Response:

```json
{
  "year": 2026,
  "rows": [{ "company": "Client A", "months": [0, 1234.56, ...12] }],
  "columnTotals": [0, 1234.56, ...12]
}
```

## Client export

`downloadArMonthlySummaryYearPivot` builds Excel:

- Columns: Company, January … December
- One row per company; trailing **Grand Total** row from `columnTotals`
- Filename: `ar-monthly-summary-YYYY.xlsx`
- Numeric cells (2 dp); empty months are `0`

Year is taken from the page **month** filter (`YYYY-MM` → `YYYY`), not from client/search filters.

## Removed

- **Export monthly sales report** button and `downloadArSalesReport`.

## Smoke

1. Log in → Receivables → Monthly summary.
2. Pick a month in a year with data → **Download monthly summary**.
3. Open XLSX: 13 data columns (Company + 12 months), Grand Total row, filename `ar-monthly-summary-YYYY.xlsx`.