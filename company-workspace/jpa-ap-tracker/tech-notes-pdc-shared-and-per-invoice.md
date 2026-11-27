# PDC: own schedules and shared checks on one payable

A Post Dated Check payable can mix two kinds of PDC coverage. An invoice has its own schedule of one or more checks that sum to its net, or it sits on a shared PDC. A shared PDC is one check that pays several invoices in full. A payable can have any number of shared PDCs. This note supersedes the API contract in `tech-notes-pdc-per-invoice.md`. The rest of that note still holds.

## Data shape

Own schedules stay in `payable_pdc_lines`, keyed by `payable_invoice_id`, as before. Migration `037_pdc_shared_groups.sql` adds two tables:

- `payable_pdc_groups` holds one row per shared check, with `pdc_no`, `pdc_date`, and `sort_order`. It stores no amount. The amount is `SUM(net_amount)` of its invoices, computed on read, so it cannot drift from the invoices.
- `payable_pdc_group_invoices` links invoices to shared checks. Its primary key is `payable_invoice_id`, so an invoice is on at most one shared check. Composite foreign keys pin the check and the invoice to the same payable, and deleting either one cascades.

On the server, each invoice resolves to one value of `InvoicePdc` in `server/lib/payablePdc.ts`. The value is either `{ kind: 'own', lines }` or `{ kind: 'shared', group }`. `savePdcPlan` is the only writer. It deletes every PDC row of the payable and inserts the plan, so the database never holds own lines and a shared check for the same invoice. The database does not enforce that rule across the two tables. A future writer that skips `savePdcPlan` could break it.

A shared check with one invoice is stored as that invoice's own one-line schedule. The line keeps the check's `pdc_no` and `pdc_date`, and its amount is the invoice net. The client applies the same rule, so what the form shows is what reloads.

## API contract

| Call | PDC fields | Rule |
|------|-----------|------|
| `GET /api/payables/:id` | `invoices[].pdc_lines`, `invoices[].pdc_group`, `pdc_groups[]` | `pdc_group` is the `key` of the shared check that pays the invoice, or `null`. Each `pdc_groups[]` item has `key`, `pdc_no`, `pdc_date`, `amount`, and `invoice_ids`. `key` is the stored id as a string. |
| `POST /api/payables`, `PUT /api/payables/:id` | `invoices[].pdc_lines`, `invoices[].pdc_group`, `invoices[].id`, `pdc_groups[]` | Each `pdc_groups[]` item has `key`, `pdc_no`, and `pdc_date`. New checks use any unique key, for example `new-1`. A GET response can be sent back as the PUT body unchanged. |
| `POST /api/payables/batch` | `invoices[].pdc_lines` | Each invoice becomes its own payable, so shared checks do not apply. A `pdc_group` key fails with 400. |
| `PATCH /api/payables/:id/status` | `invoices: [{ id, pdc_lines?, pdc_group? }]`, `pdc_groups[]` | The same rules apply, keyed by stored invoice id. PDC handling runs when the body has `invoices` or `pdc_groups`. Invoices that the body leaves out keep their coverage. |

The server resolves each invoice in this order:

1. A `pdc_group` string puts the invoice on that shared check.
2. A non-empty `pdc_lines` gives the invoice that own schedule.
3. `pdc_group: null` with no lines takes the invoice off any shared check. It keeps a stored own schedule, if one exists.
4. No `pdc_group` and no lines keeps whatever is stored under the echoed `id`, own lines or shared check. A request that leaves out one shape never wipes the other.

The server checks fields first:

- An invoice that sends both a `pdc_group` string and non-empty `pdc_lines` fails with 400. The error is on `invoices.N.pdc_group`.
- A `pdc_group` key that is not in `pdc_groups` and is not a stored check fails with 400 on `invoices.N.pdc_group`.
- Fields in `pdc_groups` override the stored `pdc_no` and `pdc_date` for the same key.

A submit (`is_draft: false`) and a status `PATCH` check coverage. Every invoice on its own schedule needs at least one line, and its lines must sum to its net within ₱0.01. An invoice on a shared check always passes, because the check amount is derived. A draft save stores what resolves and checks no balance. When the method is not PDC, the server deletes all own lines and all shared checks.

## Client

- `client/src/lib/pdc.ts` holds the payload builders and the membership reducer. `setSharedPdcMembers` puts exactly the chosen invoices on a shared check. `endLoneSharedPdcs` turns a shared check that has one invoice left into that invoice's own line.
- `InvoiceDraft.pdc_group` names the shared check. The check no. and date live in `sharedPdcs` state, keyed the same way. `fromPayable` loads both in the same effect as the invoices. An invoice keeps its `pdc_lines` in state while it is shared, so **Use own PDC schedule** restores them in the same session.
- On `PayableFormPage`, an invoice row on its own schedule shows `PdcSchedulePanel` and the **Share one PDC with other invoices…** button. The button shows when the payable has two or more invoices and the form is not in separate-payable-per-invoice mode. An invoice row on a shared check shows `SharedPdcSummary` with **Edit shared PDC…** and **Use own PDC schedule**.
- `SharedPdcModal` edits the PDC no. and the PDC date, and has a checkbox for each invoice. The amount field is read-only and shows the sum of the checked nets. **Share PDC** and **Apply** need at least two checked invoices. **End shared PDC** moves every invoice on the check back to its own schedule. The modal renders outside the page `<form>`, because the close button of `Modal` has no `type="button"`.
- `StatusChangeModal` shows `PdcSchedulePanel` for each invoice on its own schedule and one block for each shared check, where you can edit the PDC no. and the PDC date. Changes to which invoices share a check happen on the edit form.
- `InvoiceLinesPanel` shows a shared check as `Shared: no · date · amount` with the invoice numbers it pays. The list's `pdc_count` counts own lines plus shared checks.

## Known behavior

- `replaceInvoices` re-inserts invoice rows on every `PUT`, and `savePdcPlan` re-inserts shared checks. Both kinds of id change after each save. A client must reload before it sends another PUT that depends on stored keys.
- A shared PDC can be created only on a payable that already has two or more invoices. The create form has one invoice unless it is in separate-payable mode, so you share a check on the edit form after you add invoices.
- `server/lib/sqlGuard.ts` does not list the two new tables, so AI report queries cannot read shared checks yet.

## Verify

Run these commands from `jpa-ap-tracker`:

```powershell
npm test
npm run typecheck
$env:BASE_PATH='/'
npm run build
docker compose up -d --force-recreate app
node scripts/prove-pdc-shared.mjs
node scripts/prove-pdc-per-invoice.mjs
```

`npm run clean` keeps `dist/.env`. `scripts/prove-pdc-shared.mjs` creates a payable with three invoices. Invoice 1 has two own PDCs, and invoices 2 and 3 share one check. The script then covers GET-to-PUT round-trip and submit, keep-on-omit for both shapes, the double-coverage and unknown-key errors, the derived amount after a gross edit, a second shared check, a status `PATCH`, the one-invoice collapse, and a method switch. It deletes what it creates.

After a rebuild, hard-refresh the browser so it loads the new bundle. On Windows, press **Ctrl+Shift+R** on `http://localhost:8080`. The bundle name changes with each build. To check which bundle the server sends, open the page source and find `assets/index-*.js`.
