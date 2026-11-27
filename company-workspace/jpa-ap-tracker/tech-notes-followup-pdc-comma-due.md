# Follow-up: PDC draft retention, comma amounts, AR due date column

> The PDC parts of this note are superseded. PDC lines now belong to each invoice line. See `tech-notes-pdc-per-invoice.md`.

## Files changed

| Area | Files |
|------|-------|
| PDC draft | `server/routes/ledgerDocuments.ts`, `client/src/pages/PayableFormPage.tsx`, `client/src/components/PdcSchedulePanel.tsx`, `client/src/components/StatusChangeModal.tsx` |
| Comma amounts | `client/src/format.ts` (`formatAmountOnBlur`), `PayableFormPage.tsx`, `PdcSchedulePanel.tsx`, `SourceAccountsPage.tsx`, `LiquidationsPage.tsx`, `LiquidationDetailPage.tsx`, `PettyCashPage.tsx`, `ReceivablesBillingPage.tsx` |
| AR billing lines | `client/src/pages/ReceivablesBillingPage.tsx` (Due date column uses `summary_due_date` from existing API) |

## PDC draft behavior

- **Server:** Draft creates now persist `pdc_lines` whenever the client sends the field (not only when the array is non-empty on create).
- **Client:** Save always includes `pdc_lines` when the PDC panel applies or lines exist in state (draft or submitted). Edit loads PDC with fresh fetch, formats amounts, and shows the panel when stored PDC exists even before payment-method lookups finish.

See also **`tech-notes-pdc-draft-assignee-fix.md`** (draft submit 403 + draft PUT must not wipe PDC when `pdc_lines` is missing/empty).

## Verify manually

1. **PDC draft:** Payables → new → PDC method → add PDC lines → Save Draft → reopen edit → no./date/amount still present → Save Draft again → reload once more.
2. **Commas:** Blur any amount field (payable gross, PDC, source account txn, liquidation, petty cash, AR detail) — thousands separators appear; submit still accepts comma-stripped values.
3. **Due date:** Receivables → Billing lines → column **Due date** (MM/DD/YYYY) after Receiving date.

## Commands

```powershell
cd jpa-ap-tracker
npm test
npm run typecheck
npm run dev
```

Docker (:8080) only if CEO uses it:

```powershell
$env:BASE_PATH='/'
npm run build
docker compose up -d --force-recreate app
```