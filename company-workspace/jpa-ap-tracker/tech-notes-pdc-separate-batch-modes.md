# PDC on create when “Separate payable per invoice” is on

## Context

When payment method is **Post Dated Check** and create uses **Separate payable per invoice**, the form offers two modes. Both call `POST /api/payables/batch`; the server does **not** use in-payable `pdc_groups` for this flow.

| Mode | UI | Batch payload |
|------|-----|----------------|
| **A — PDC per invoice** | `PdcSchedulePanel` inside each invoice row | Each item: `pdc_lines` summing to that invoice’s net |
| **B — One PDC for all** | Shared check no./date + read-only total (= sum of nets) above the invoice list | Each item: one `pdc_line` with the same `pdc_no`/`pdc_date` and `amount` = that payable’s net |

When Separate is **off**, behavior is unchanged (one payable; per-invoice lines and/or in-payable shared groups).

## Client

- `PayableFormPage.tsx`: `separatePdcMode`, `batchSharedPdc`, radio toggle, mode B block, `showPerInvoicePdc`.
- `client/src/lib/pdc.ts`: `invoicePdcForSeparateBatchCreate`, `onePdcForAllBatchProblem`, `batchOnePdcLinePayload`.
- `canSharePdc` stays false on create + separate (in-payable “Share one PDC…” is not mode B).

## Server

- `POST /payables/batch`: `payableBatchSchema` allows `invoices[].pdc_lines`; `pdc_group` on any line → 400.
- Batch loop calls `savePayablePdc` with `invoices: data.invoices` (the single line for that payable), not the full batch array.
- No cross-payable FK; mode B is represented as identical check metadata on each payable’s one line.

## Verify

```bash
npm test
npm run typecheck
node scripts/prove-pdc-separate-batch.mjs   # needs API on APP_URL (default http://localhost:8080)
```

Manual UI: create → PDC → separate → mode B → submit → three payables, same check no./date, amounts = split nets.

## Residual risks

- Mode B check total is client-derived; server still validates each line against **that** payable’s computed net on submit (not draft).
- Legacy proof script `prove-pdc-per-invoice.mjs` batch section covers mode A only.