# Design brief — PDF adjustment (JPA AP/AR Tracker)

**Scope:** Extend existing JPA FMCS visual system (`styles.css`, `card` / `filters` / `summary` / `table-wrap`, `StatusSelect`, `Modal`, `paper-form`). **Do not** introduce a new brand, palette, or layout shell. **Desktop-first**; mobile only where current patterns already break.

**Surfaces in scope**

| Area | Files / patterns |
|------|------------------|
| AP multi-invoice payment | `PayableFormPage.tsx`, `InvoiceLinesPanel.tsx`, `PayablesPage.tsx`, `ledger.tsx` copy |
| AP status workflow | `PayablesPage.tsx`, `StatusChangeModal.tsx`, `UpcomingReleasePage.tsx`, `StatusHistoryPanel.tsx` |
| AP amounts | `format.ts`, `formatMoney`, list + form numeric fields |
| AR search / dates / totals | `ReceivablesBillingPage.tsx` (details + summary modes) |
| AR exports | Same page `page-header-actions` (pattern: `PettyCashPage.tsx`, `UpcomingReleasePage.tsx`) |

---

## User & success moment

| Role | Job | Success moment |
|------|-----|----------------|
| AP staff / reviewer | Record several supplier invoices, pay via one check or several PDCs, advance status only when assigned | Payable shows correct invoice breakdown, instrument total matches net amount, status moves one legal step with audit trail |
| AR billing staff | Find invoices by due date and number, see filtered totals, download month files for finance | Filtered list shows **count + peso total**, exports open in Excel with expected freight columns |
| Admin | Configure who moves which status step | Staff without assignment or permission see read-only status; no silent failures |

---

## Payables — A: Consolidated amount → multiple PDCs

**Intent:** One payable (one net total, one or more invoice lines) is settled with **multiple post-dated checks** whose amounts sum to the payable net.

**Entry points**

1. **Create / edit payable** — When payment method is **Post Dated Check** (or method name contains “PDC”, case-insensitive), show section **“PDC schedule”** below invoices (same `form-section` rhythm as section 3–4).
2. **Status change** — When moving to **Create Check for Deposit** or **Create Check for Release** and method is PDC, surface the same schedule in `StatusChangeModal` if empty or incomplete (do not open a second modal type).

**UI pattern (minimal)**

- Repeatable rows in `invoice-row` / `entry-sheet-grid` style: **PDC no.** (text), **PDC date** (`type="date"`), **Amount (PHP)** (`inputMode="decimal"`).
- Toolbar: `+ Add PDC`, remove row per line (icon/button `btn ghost small`).
- **Sticky footer row** in the block: `Scheduled total: {formatMoney(sum)}` vs `Payable net: {formatMoney(payable.amount)}` — use `tag-overdue` / danger text when mismatch; block Save / Confirm until equal (±₱0.01).
- List: if `pdc_count > 1`, show muted subline under Reference: `3 PDCs` + chevron expand (reuse `InvoiceLinesPanel` expand pattern).

**Happy path**

1. User creates payable with multiple invoice lines (one document) and PDC method.
2. User adds 2+ PDC rows splitting the net total.
3. On submit or status confirm, server persists schedule; list shows expandable PDC detail.

**States**

| State | UX |
|-------|-----|
| Empty PDC schedule when method requires it | Inline hint + disabled primary until ≥1 row |
| Sum ≠ net | Error under footer; field-level optional highlight on amount cells |
| Read-only viewer | Schedule visible, no edit controls (`form-readonly`) |

---

## Payables — B: Multiple invoices → one check

**Intent:** Several invoice numbers, **one payment instrument** (single check / one `payment_reference`).

**Primary path (already aligned):** Default create flow = **one payable, multiple invoice lines** (`ledger.oneDocChoice`). Do **not** make “Create separate invoices” (`splitSeparate`) the default.

**UX adjustments**

1. **Create form** — Replace bare checkbox with a compact **radio group** in the invoices block:
   - **Recommended (default):** “One payment for multiple invoices” → single payable, `+ Add invoice` on edit / multi-line on create after first line.
   - **Advanced:** “Separate payable per invoice” → existing `splitSeparate` + batch behavior.
2. **Payables list** — Multi-invoice rows keep accordion (`{n} invoices`); primary invoice no. remains visible in collapsed state.
3. **One check for multiple payables (ASSUMPTION — if product needs cross-row merge):** On `PayablesPage`, when user has `payables_status` and rows share supplier + are on **For review** or **Create Check for Deposit**, optional bulk action **“Apply one check”** (same selection pattern as `UpcomingReleasePage` checkboxes): single modal collects **check no.**, **check date**, **source account**; applies shared `payment_reference` and moves rows together. If not in v1, eng ships A + default one-doc only; design reserves bulk bar pattern from Upcoming Release.

**Happy path**

1. User selects supplier, adds invoice A + B under one payable.
2. User proceeds workflow; at deposit/release, enters one check no. in `StatusChangeModal`.
3. List shows one reference; expanding row shows both invoice numbers.

---

## Payables — C: Status flow UI (role-gated)

**Workflow labels (display)** — Map to configured statuses (`sort_order` 10→50):

```
For review → Create Check for Deposit → Create Check for Release → Check Deposited → Check Released
```

(PDF “FOR CHECK DEPOSIT/RELEASE” = the two open steps above; “DEPOSITED/RELEASED” = Check Deposited → Check Released where **Check Released** is `category === 'paid'`.)

**UI (extend, don’t replace)**

1. **Read-only stepper** — On `PayableFormPage` (edit) and top of `StatusChangeModal`, add horizontal **workflow strip**: pills using each status `color` from `StatusSelect` (inactive = muted border, current = filled, future = outline). Max 5 steps; truncate label with `title` tooltip on narrow widths. Hidden for drafts.
2. **Transitions** — Keep `StatusSelect` + modal confirmation; only destinations in `allowedPayableStatusIdsForRow` appear (already mirrors server).
3. **Role gating (client)** — Intersect dropdown `allowedIds` with:
   - Assignee rule (unchanged): non-admin cannot change status if `assigned_to !== self`.
   - **Staff destination permissions:** if `auth.user.payable_status_ids` is non-empty, only show target statuses whose `id` is in that list (admins: no filter). If intersection empty, render status as **read-only text** + `title="You are not allowed to set this status"` — not a disabled dropdown that looks broken.
4. **Custom fields** — Continue per-status fields in modal (check no., dates). Show `show_in_list` values in table columns (existing).
5. **Gate messaging** — 403 from server: surface `ErrorBox` with assignee vs permission copy; do not clear the row.

**Happy path**

1. Assignee on **For review** opens payable, sees stepper at step 1.
2. Chooses **Create Check for Deposit** → modal → source account → confirm; stepper advances; assignee may auto-change per server rules.
3. User without permission sees stepper + static status name only.

**States**

| State | UX |
|-------|-----|
| Loading statuses | Stepper skeleton or omit until loaded |
| Cancel / anytime (`sort_order === 0`) | Stepper shows “exception” badge; assignee picker required (existing) |
| Paid | Stepper complete; `paid_at` / `check_date` in muted subline (existing) |

---

## Payables — D: Thousand separators (commas)

**Display:** Continue `formatMoney` (`en-PH` currency) everywhere amounts appear in tables, modals, summaries, PDC footer, exports.

**Inputs:** On **blur** of amount fields (header amount, invoice gross, PDC amount, tax preview labels already formatted), show **live preview** muted line: `Preview: 1,234,567.89` using shared helper (extend `format.ts` — `formatAmountPlain(n)` with `en-US` minimumFractionDigits 2). Inputs stay editable as plain digits; do not fight the caret with forced commas while typing.

**ASSUMPTION:** PDF “commas” applies to **display and Excel export**, not locked formatted inputs.

---

## Receivables — A: Due date + invoice search + MM/DD/YYYY dates

**Toolbar** (`card filters` — extend both modes where noted)

| Control | Details | Summary mode | Details mode |
|---------|---------|--------------|--------------|
| **Due date range** | `Due from` / `Due to`, `type="date"` — mirror Payables “More filters” | Filter summaries by `due_date` | Filter detail lines by parent summary due or line billing due (eng picks consistent rule; prefer summary `due_date`) |
| **Invoice search** | `type="search"`, placeholder `Invoice no.` — Enter or blur commits (Payables search pattern) | Filter `invoice_no` contains | Same; **replace** invoice-only `<select>` with search **or** keep select + add search for partial match (prefer search for PDF) |

**Date display (AR tables only for this pass):** Add `formatDateMdY(iso)` → `MM/DD/YYYY` (UTC-safe like `formatDate`). Use in `ReceivablesBillingPage` table cells: due date, billing date, coverage, trip `entry_date`, payment modal due field **display**; keep `type="date"` in forms for entry.

**Do not** change Payables / global `formatDate` weekday style in this scope.

---

## Receivables — B: Totals (count + amount)

**Placement:** Reuse Payables list pattern — `div.summary` directly under filters, above table:

```text
{n} invoices · Total: {formatMoney(totalAmount)}
```

- **Summary mode:** `n` = filtered summary rows; total = sum of `grand_total` (or `total_after_ewt` if product standard — **ASSUMPTION:** `grand_total`).
- **Details mode:** `n` = filtered detail lines; total = sum of `amount`.
- Show `—` while loading; `0` / `₱0.00` with existing empty copy when no rows.

---

## Receivables — C / D: Export entry points

**Placement:** `page-header-actions` beside existing Upload (details) — secondary `btn` buttons (not primary), matching Petty Cash **Export Excel**.

| Button | Mode | Enabled when | Filename pattern |
|--------|------|--------------|------------------|
| **Download monthly summary** | Summary only | ≥1 row in current filter (or always; empty sheet with headers) | `ar-monthly-summary-{YYYY-MM}.xlsx` |
| **Export monthly sales report** | Summary (default) **ASSUMPTION:** includes detail lines for selected month/client | Same filters as grid | `ar-sales-report-{YYYY-MM}.xlsx` |

Respect `ar_view` / `ar_edit`; read-only users may export if they can view the page (match Petty Cash).

**Column sets (ASSUMPTION — freight / AR context, no sample files)**

*Monthly summary sheet*

- Client, Invoice No., Billing Reference, Trip Type, Trip Classification, Fleet Type, Service Type, Coverage Start, Coverage End, Invoice Date, Due Date, Payment Status, VATex Sales, VAT Amount, VATinc Sales, EWT, Total After EWT, Deductions, Grand Total, Detail Line Count, 2307 Status, Aging Days, Days Past Due

*Monthly sales report sheet*

- Client, Invoice No., Billing Reference, Trip Type, Trip Classification, Fleet, Service, Coverage Start, Coverage End, Billing Date, Due Date, Waybill / Reference, Origin, Destination, Trip Date, Line Amount, Payment Status, Grand Total (invoice)

Dates in Excel: **ISO `YYYY-MM-DD`** cells (Excel date-friendly) plus optional display column `MM/DD/YYYY` if trivial.

**States**

| State | UX |
|-------|-----|
| Export in progress | Button `Exporting…`, disabled |
| API error | `ErrorBox`; button re-enabled |
| Empty filter | Download still allowed — headers only + note row “No data for selected filters” |

---

## Information architecture (delta only)

```
Payables
├── List (filters, summary, table) — PDC hint, comma amounts
├── Form — invoice mode radio, PDC schedule section, workflow stepper
└── Status modal — stepper, PDC if needed

Receivables
├── Billing lines — due range, invoice search, totals, MM/DD/YYYY columns
└── Monthly summary — same filters + totals + 2 export buttons
```

No new top-level nav items.

---

## States (cross-cutting)

| Surface | Empty | Loading | Error | Success |
|---------|-------|---------|-------|---------|
| AP PDC block | Hint to add row | — | Sum mismatch | Green check on match (optional muted text) |
| AP status | — | Stepper hidden | ErrorBox + keep modal open | Close modal, invalidate list |
| AR filters | Table empty copy unchanged | Summary `…` | `ErrorBox` | Exports trigger browser download |
| AR search | “No … match” in table | `Loading…` row | — | Totals update with query |

---

## Visual direction

- Workflow stepper: 12–13px labels, status hex colors at 15% background for current step (same as `StatusSelect`).
- PDC block: visually sibling to **Invoices** section, not a new card type.
- Export buttons: same height as **Upload Excel**; summary export left of sales report.

---

## Motion

1. PDC row add/remove: no animation (instant).
2. Invoice accordion: existing chevron rotate only.
3. Stepper current step: optional 150ms background fade on status change (respect `prefers-reduced-motion`).

---

## Accessibility

- Stepper: `role="list"`, current step `aria-current="step"`.
- PDC table: `<table>` or labeled row groups; each amount input `aria-describedby` pointing to running total.
- Invoice search: `<label>` visible via `field-label`; `type="search"` accessible name “Invoice number”.
- Status permission: disabled dropdown replaced by text + `title` / `aria-label` explaining why.
- Focus trap in modals unchanged (`Modal` + Escape).

---

## Mobile / desktop

- Desktop: primary target; filters wrap as today.
- Mobile: if workflow stepper wraps >2 lines, switch to **vertical** step list (same colors). No new mobile-only flows.

---

## Decisions for CEO

1. **Cross-payable one check (B bulk):** Ship in v1 or defer to one-payable-multi-line only?
2. **Sales report scope:** Summary sheet only vs include all detail lines under filtered invoices (brief assumes **detail lines**).
3. **AR due filter on details:** Filter by summary due date vs line billing date.
4. **Staff `payable_status_ids` UI filter:** Confirm server will enforce the same intersection on PATCH (client-only is insufficient for security).

---

## Handoffs

**Engineer**

- Implement surfaces above only; reuse `formatMoney`, `StatusSelect`, `Modal`, selection bulk bar from `UpcomingReleasePage`.
- Server contracts for PDC schedule and AR exports are out of this brief but must match column ASSUMPTIONs.
- Add `formatDateMdY` / `formatAmountPlain`; do not regress Payables date formatting.

**Marketer**

- No GTM; optional tooltip copy for invoice mode radio labels can mirror `ledger.oneDocChoice` / `severalDocsChoice`.

---

## Engineering UX decisions (must follow)

1. **One payment default:** Multi-invoice payables default to **one payable / one check**; separate payables per invoice is explicitly **advanced**, not default.
2. **PDC schedule:** When payment method is PDC, allocations must **sum to payable net** before save or status confirm; show running total vs net in-place (no new page).
3. **Workflow stepper + existing modal:** Show linear **For review → … → Check Released** stepper on edit + status modal; keep `StatusSelect` as the only control that triggers transitions.
4. **Role-gated statuses:** Non-admin users see only status targets allowed by **workflow step ∩ assignee rule ∩ `payable_status_ids`**; otherwise read-only status text with explanatory tooltip.
5. **Comma amounts:** All **read-only** money uses `formatMoney`; editable fields get blur **preview** with thousand separators, not inline comma masking while typing.
6. **AR filters:** Add **due from / due to** and **invoice search** on receivables billing pages using the same filter card and Enter/blur commit behavior as Payables.
7. **AR totals:** Always show **`{count} invoices · Total: {amount}`** in `div.summary` for the active AR mode, driven by current filters.
8. **AR exports:** Add **Download monthly summary** and **Export monthly sales report** in summary header actions; Excel columns per ASSUMPTION tables; disabled state only while request pending.