# Fix: draft submit assignee 403 + PDC lines wiped on draft save

> The PDC parts of this note are superseded. PDC lines now belong to each invoice line. See `tech-notes-pdc-per-invoice.md`.

## Root causes

| Bug | Cause |
|-----|--------|
| **A — Save and submit** | Draft payables keep `assigned_to = null`. On PUT when `is_draft` becomes false, `status_id` moves to For review (`statusChanged`), and `assertCanChangeAssignedStatus` ran against `null` → 403 even for the creator (edit access was already granted via `assertCanEditPayable`). |
| **B — PDC on draft edit** | Client sometimes omitted `pdc_lines` or sent `pdc_lines: []` while lines were not yet in React state; server `replacePayablePdcLines` always DELETE-then-insert, so empty payloads wiped `payable_pdc_lines`. |

## Files changed

- `server/routes/ledgerDocuments.ts` — skip assignee status check on draft submit; draft PUT preserves PDC rows unless a non-empty `pdc_lines` array is sent
- `server/lib/payablePdc.ts` — `parsePdcLineAmount` (comma strip) for insert and schedule validation
- `client/src/pages/PayableFormPage.tsx` — always send filtered `pdc_lines` for PDC method; auto-seed one line; stable load from API; omit `pdc_lines` when edit still loading stored rows
- `server/lib/payablePdc.test.ts` — comma parse test

## Verify

1. **Draft submit (creator):** Create payable as staff → Save Draft → Save and Submit. Expect 200, status For review, not `Payable is not assigned to you`.
2. **PDC draft round-trip:** New payable → payment method Post Dated Check → fill PDC no/date/amount → Save Draft → reopen edit → lines visible → Save Draft again → DB: `SELECT * FROM payable_pdc_lines WHERE payable_id = ?` still has rows.
3. **Comma amount on server:** PDC line amount `10,000.50` on submit saves and passes schedule sum check.

```powershell
cd jpa-ap-tracker
npm test
npm run typecheck
$env:BASE_PATH='/'
npm run build
docker compose up -d --force-recreate app
```

Ensure `dist/.env` is preserved across `npm run build` (project build script should copy root `.env` without deleting custom `dist/.env` overrides).