# Tech notes — PDF adjustment

## Migrations

Run `035_pdf_adjustment.sql` against the app database (idempotent):

- Table `payable_pdc_lines` for multi-PDC schedules (amount, optional no/date).
- `user_payable_default_statuses`: Jeanette → For review / Check Deposited / Check Released; Crissa → Create Check for Deposit / Release.
- `user_payable_status_permissions`: Jeanette (review + completion + anytime); Crissa (create check + deposited/released + anytime).
- Admin display name → **Jea** when username is `admin`.

## Server

- `resolveCreateStatus` staff submit → **For review** (not legacy “for release”).
- `assertCanSetPayableStatus` enforces `AuthUser.payable_status_ids` for staff (403 if destination not allowed). Admin unchanged.
- PDC: `server/lib/payablePdc.ts` validates sum = net on create/update/status PATCH; lines returned on `GET /api/payables/:id` as `pdc_lines`; list rows include `pdc_count`.
- AR: `GET /api/ar/summaries` and `/api/ar/details` accept `search`, `dueFrom`, `dueTo` (details due filter uses parent summary `due_date`).

## Client

- `formatDateMdY`, `formatAmountPlain`; AR tables use MM/DD/YYYY.
- `PdcSchedulePanel`, `WorkflowStepper`; payable form invoice mode radio; status modal PDC when moving to Create Check steps with PDC method.
- `allowedPayableStatusIdsForRow` intersects workflow with `payable_status_ids`.
- AR billing: invoice search, due range, totals strip, Excel exports (`ar-monthly-summary-*.xlsx`, `ar-sales-report-*.xlsx`).

## How to run

```bash
cd jpa-ap-tracker
# apply migration 035 via your usual migrate flow
npm run dev
```

Staff logins (seeded): `msjeanette` / `msjeanette`, `mscrissa` / `mscrissa`, admin `admin` / `admin123` (Jea).

## Tests

```bash
npm test
npm run typecheck
```