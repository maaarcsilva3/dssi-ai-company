# Cross-payable shared PDC batch link (separate create mode B)

## Data model

| Store | Role |
|-------|------|
| `payable_shared_pdc_batches` | One row per shared check across sibling payables: `id`, `pdc_no`, `pdc_date` |
| `payables.shared_pdc_batch_id` | FK nullable; all mode-B siblings share the same batch id |

Per payable, PDC is still stored in `payable_pdc_lines` (one line, amount = that payable’s net). In-payable `payable_pdc_groups` is **not** used for this flow.

## API

- `POST /payables/batch`: after creating all rows, if every item has exactly one `pdc_line` with the same `pdc_no`/`pdc_date`, creates a batch and links all payables; `syncSharedBatchPdcLines` rewrites lines from batch header + current nets.
- `GET /payables/:id`: when linked, includes `shared_pdc_batch: { id, pdc_no, pdc_date, amount_total, members: [{ payable_id, invoice_no, net }] }`.
- `PUT` / `PATCH …/status`: when `shared_pdc_batch_id` is set, rejects `shared_pdc_batch: null`, `pdc_groups`, `invoices[].pdc_group`, or multi-line `pdc_lines`. Accepts `shared_pdc_batch: { pdc_no, pdc_date }` (or the same on the single `pdc_line`); updates the batch row and re-syncs **all** members.

Mode A batch create and single-payable `pdc_groups` are unchanged (`shared_pdc_batch_id` stays null).

## UI

`PayableFormPage`: when `shared_pdc_batch` is present on load, shows the outside “One PDC for all” block (member list + check no./date + read-only total). Hides per-invoice PDC panels and in-payable share/unshare controls.

## Verify

```bash
npm test
npm run typecheck
node scripts/prove-pdc-shared-batch-link.mjs
node scripts/prove-pdc-separate-batch.mjs   # mode B should also expose shared_pdc_batch
```

## Residual risks

- Legacy mode-B payables created before migration 038 have matching lines but no batch id until re-saved (no auto-backfill).
- Amount total on the edit form is client-derived until save; server recomputes on sync.
- Deleting one sibling payable leaves others linked; batch row is not auto-deleted when membership drops to one (still one line per payable).