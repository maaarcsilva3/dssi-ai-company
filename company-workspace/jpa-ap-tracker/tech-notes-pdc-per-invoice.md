# PDC schedule per invoice line

Shared PDCs extend this design. For the current API contract, read `tech-notes-pdc-shared-and-per-invoice.md`.

Each invoice line on a Post Dated Check payable owns its PDC schedule. The schedule must sum to that invoice's net, within ₱0.01. This note supersedes the payable-level schedule in `tech-notes-pdc-draft-assignee-fix.md` and `tech-notes-followup-pdc-comma-due.md`.

## Why the schedule moved

The old design kept `pdc_lines` beside `invoices`, at the payable level. The form held them in a separate React state slot, and an effect seeded a blank row into that slot. Every earlier fix kept that premise, and two symptoms remained:

- Draft #132 saved with no PDC rows.
- Submitted #131 had `pdc1` in the database, but its edit form showed a blank schedule.

Both symptoms come from the separate slot. It loaded and saved out of step with the invoices it depended on. Now the lines are a field of each invoice. `fromPayable` loads them in the same state update as the invoice, so no effect can overwrite them.

## Data shape

`payable_pdc_lines` has `payable_invoice_id`, which is `NOT NULL`. The composite foreign key `FOREIGN KEY (payable_invoice_id, payable_id) REFERENCES payable_invoices (id, payable_id) ON DELETE CASCADE` stops a line from pointing at another payable's invoice. `payable_id` stays for the list's `pdc_count` query.

Migration `036_pdc_per_invoice.sql` attached each legacy row to its payable's first invoice, ordered by `sort_order, id`. That rule is an assumption about legacy data. All 5 existing rows (payables 127 to 131) had one invoice each, so no row was ambiguous or deleted.

## API contract

| Call | PDC field | Rule |
|------|-----------|------|
| `GET /api/payables/:id` | `invoices[].pdc_lines` | Lines for each invoice. The top-level `pdc_lines` field is gone. |
| `POST /api/payables`, `POST /api/payables/batch`, `PUT /api/payables/:id` | `invoices[].pdc_lines`, `invoices[].id` | A non-empty `pdc_lines` replaces that invoice's lines. An empty or omitted `pdc_lines` keeps the lines stored under the echoed `id`. |
| `PATCH /api/payables/:id/status` | `invoices: [{ id, pdc_lines }]` | Same rule, keyed by stored invoice id. An unknown id returns 400. |

These rules apply when the payment method is PDC:

- A submit (`is_draft: false`) and a status `PATCH` with `invoices` need at least one line on every invoice. Each invoice's lines must sum to its `net_amount`, compared in centavos with a tolerance of 1. A PDC payable with no invoice lines fails.
- A draft save stores whatever lines resolve. It runs no balance check.

When the payment method is not PDC, the server ignores `pdc_lines` and stores none.

Errors use the key `invoices.N.pdc_lines`, for example `Invoice 2 (INV-9): PDC total (2000.00) must equal invoice net (2500.50)`.

## Client

- `InvoiceDraft.pdc_lines` holds the schedule. `PdcSchedulePanel` renders inside each invoice row on `PayableFormPage` when the method is PDC.
- `StatusChangeModal` fetches the payable detail and shows one panel per invoice. `PayablesPage` and `UpcomingReleasePage` forward the `invoices` payload. Before this change, `UpcomingReleasePage` dropped the PDC payload.
- `InvoiceLinesPanel`, the expanded row in the list, shows a **PDC** column when any invoice has lines.
- `client/src/lib/pdc.ts` holds the shared mapping, payload, and balance helpers.

## Known behavior

- A draft save that clears every line on an invoice keeps the stored lines. Switch the method away from PDC to drop a schedule.
- `replaceInvoices` deletes and re-inserts invoice rows on every save, so invoice ids change after each `PUT`. A client that holds stale ids loses the keep-stored fallback. The status `PATCH` rejects stale ids.

## Verify

Run these commands from `jpa-ap-tracker`:

```powershell
npm test
npm run typecheck
$env:BASE_PATH='/'
npm run build
docker compose up -d --force-recreate app
node scripts/prove-pdc-per-invoice.mjs
```

`npm run clean` now keeps `dist/.env`. `scripts/prove-pdc-per-invoice.mjs` signs in as `admin` against `http://localhost:8080`. It exercises create, edit round-trip, keep-on-empty, per-invoice submit validation, status `PATCH`, invoice removal, method switch, batch create, and legacy #131. It deletes the payables it creates. Set `APP_URL`, `APP_USER`, and `APP_PASS` to override the defaults.
