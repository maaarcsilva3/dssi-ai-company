## Product brief

### Problem
JPA AP/AR Tracker does not yet match the client PDF for payables consolidation/check flows, the Jeanette → Jea → Crissa → Jeanette status handoff, comma-separated amounts, and AR list/search/date/export requirements. Staff cannot complete day-to-day AP/AR in the tool the way FMCS specified.

### User / JTBD
- **Jeanette Matira (`msjeanette`, staff):** intake payables and complete deposit/release steps.
- **Jea (CEO: admin reviewer):** approve payables from review into check creation (`role = admin`; **ASSUMPTION:** Jea = seeded `admin` user, display name may be updated to “Jea” in Users).
- **Crissa Ortiz (`mscrissa`, staff):** create checks (Create Check for Deposit / Create Check for Release).
- **AR staff (typically Crissa with `ar_view` / `ar_edit`):** find invoices, read due dates and totals, export monthly summary and monthly sales report for the accounting firm.

**JTBD:** Record multi-invoice payables and checks/PDCs, move each payable through the configured workflow statuses, and produce AR monthly exports without leaving the tracker.

### Success metrics (30 days post-ship)
| Metric | Target |
|--------|--------|
| Payables created by Jeanette land in **For review** on submit | 100% of non-draft staff creates (sample ≥5) |
| Illegal status transition or wrong-role transition blocked | 0 successful bypasses in QA matrix |
| Multi-invoice + single-check scenario completable | QA script passes in &lt;10 min |
| AR Monthly summary Excel download for a month with data | File opens; row count = API `ar_summaries` count for filters |
| AR invoice search returns partial matches | Typing 3+ chars filters details within 1s (client-side or API) |

### Scope

#### Must-have (all NOW — deadline today)

**Payables — data model & flows (entities: `payables`, `payable_invoices`, `payable_statuses`, `payable_status_field_values`, `payment_methods`)**

| PDF ref | Requirement |
|---------|-------------|
| **A** | One payable, **multiple invoice lines** (`payable_invoices`), **one consolidated amount** on the header (`payables.amount`), **Post Dated Check** payment method, **multiple PDC references/dates** captured at check-creation step |
| **B** | **Multiple invoices** tied to **one physical check** (shared `payment_reference`) — via one payable with multiple lines **or** bulk **Upcoming release** `POST /api/payables/window/set-status` with the same reference on selected rows |
| **C** | Status workflow per PDF (names in DB today): **For review** (10) → **Create Check for Deposit** (20) or **Create Check for Release** (30) → **Check Deposited** (40) or **Check Released** (50, `category = paid`) |
| **D** | Amounts displayed with **thousands separators** (comma) in UI lists, forms, and modals |

**Payables — role enforcement (entities: `users`, `user_payable_default_statuses`, `user_payable_status_permissions`, `assertCanChangeAssignedStatus`)**

| Step | Actor | Allowed action |
|------|-------|----------------|
| Create | Jeanette | Submit payable → **For review**; assignee rules per binding |
| Review | Jea (admin) | **For review** → **Create Check for Deposit** or **Create Check for Release** |
| Check prep | Crissa | Enter check/PDC on **Create Check** statuses → **Check Deposited** or **Check Released** |
| Complete | Jeanette | **Check Deposited** / **Check Released** (final step per PDF wording: DEPOSITED / RELEASED) |

Seed corrections (**migration/seed idempotent**): bind `user_payable_default_statuses` so workflow auto-assignee matches PDF; configure status permissions so staff cannot set statuses outside their lane (today `payable_status_ids` is stored on `AuthUser` but **not enforced** on `PATCH …/status` — must enforce).

**Fix known gap:** `resolveCreateStatus` in `server/routes/ledgerDocuments.ts` still queries `lower(name) = 'for release'` while production status is **For review** — staff creates may not default correctly until fixed.

**Receivables (entities: `ar_summaries`, `ar_detail_entries`, `ReceivablesBillingPage` modes `details` | `summary`, `GET /api/ar/summaries`, `GET /api/ar/details`)**

| PDF ref | Requirement |
|---------|-------------|
| **A** | **Due date** visible on monthly summary; **invoice search** (text, not only dropdown) on billing lines; dates shown as **MM/DD/YYYY** on AR screens |
| **B** | **Total number of invoices** and **total amount** for current filters (summary month and/or detail list) |
| **C** | **Monthly Summary** — **Download Excel** for filtered month (client-side `xlsx` pattern like `PettyCashPage` / `UpcomingReleasePage`) |
| **D** | **Monthly Sales Report** — exportable workbook for accounting firm (same month/filter context; distinct filename/label from C) |

#### Later
- Partial / fuzzy invoice search on summary mode (`invoiceNo` already supported on `GET /api/ar/summaries` but not in summary UI).
- Email/send automation of Monthly Sales Report to accounting firm (export-only today).
- Re-enable rich per-user payable status matrix in Users UI (currently cleared on save with comment “sequential workflow only”).

#### Out of scope (do not change)
Telegram, AI ask/report, liquidations, petty cash, truck allowances, legacy **receivables** ledger (customers), fuel-only behaviors beyond what payables need, suppliers masterdata unless required for AP entry, source accounts beyond **Create Check for Deposit** reserve rule, Docker/infra, unrelated UI polish.

---

### Acceptance criteria (testable today)

#### AP-A — Consolidated multi-invoice + multiple PDCs
1. As Jeanette, create a payable with **≥2** rows in **Invoices** (no “Create separate invoices”), supplier X, method **Post Dated Check**, gross lines summing to **PHP 100,000.00**.
2. **Then** header/`payables.amount` and list column show **₱100,000.00** (comma grouping).
3. **Then** `GET /api/payables/:id` returns `invoices[]` length ≥2 and amount equals sum of net/gross per product rules.
4. After Jea moves to **Create Check for Release** or **Create Check for Deposit**, Crissa can record **≥2** PDC identifiers (check numbers and/or dates via `payable_status_custom_fields` + `payable_status_field_values`, **ASSUMPTION:** one text field per PDC or repeatable UI) without splitting into separate payables.
5. **Then** status history shows entered PDC values.

#### AP-B — Multiple invoices, one check
1. Create **≥2** payables (batch or separate) for the same supplier due the same week, each with one invoice line.
2. On **Upcoming release**, select both, set the same **payment reference** (e.g. `CHK-001`), bulk-advance to **Create Check for Deposit** (with `source_account_id` if required).
3. **Then** both rows show `payment_reference = CHK-001` and combined selection total matches sum of amounts.
4. Complete through **Check Deposited** or **Check Released** with one check date.
5. **Then** history records shared reference on both payables.

#### AP-C — Status workflow
1. Jeanette submits new payable **→** status **For review** (`payable_statuses.name`, `sort_order = 10`); not draft.
2. Jea (login `admin`) **→** **Create Check for Deposit** or **Create Check for Release**; assignee becomes Crissa per `user_payable_default_statuses`.
3. Crissa **→** **Check Deposited** or **Check Released** as applicable (payment method drives deposit vs release path).
4. Jeanette **→** may perform the final hop to paid category if PDF requires her on DEPOSITED/RELEASED (if workflow already ends at **Check Released** `category = paid`, Jeanette’s step is **Check Deposited** / intermediate open step only — **ASSUMPTION:** PDF “DEPOSITED/RELEASED” maps to statuses 40 and 50 respectively).
5. **Then** `payable_status_history` row exists for each hop with `changed_by` matching the actor.
6. Attempt **Jeanette** moving **For review → Create Check** **→** HTTP **403** (or UI hides option).
7. Attempt **Crissa** creating payable that lands in **Create Check** without review **→** blocked unless admin.

#### AP-D — Amount comma format
1. Open Payables list, Payable form totals, Status change modal, Upcoming release subtotals with amount **≥1,000**.
2. **Then** every displayed currency value includes grouping comma (e.g. `₱1,234.56`) via `formatMoney` / `Intl.NumberFormat('en-PH')`.
3. **ASSUMPTION:** typed inputs may remain plain decimals; display fields must comma-format.

#### Role enforcement
1. Configure seed/bindings: Jeanette — create + statuses for deposit/release completion; Crissa — default on **Create Check for Deposit** and **Create Check for Release**; Jea — `role = admin` (full status access).
2. Staff status change requires `payables_status` **and** payable assigned to user (`assertCanChangeAssignedStatus`) **and** (after implementation) destination ∈ `user.payable_status_ids` when non-empty.
3. Admin bypasses assignee check but still respects workflow adjacency (`assertPayableStatusTransition`).
4. QA attempts cross-role transitions from matrix in brief **→** all blocked.

#### AR-A — Due date, search, date format
1. **Monthly summary** table shows **Due date** formatted **MM/DD/YYYY** (not raw `YYYY-MM-DD`, not long `formatDate` weekday form).
2. **Billing lines** filter includes **Invoice** text input; typing `SI-12` filters rows (use `search` query on `GET /api/ar/details` or client filter).
3. Editing payment modal still persists `due_date` on `ar_summaries`.

#### AR-B — Totals
1. With month M and client filter applied, UI shows **“N invoices”** and **“Total: ₱X,XXX.XX”** where N = `items.length` from summaries response and total = sum of `grand_total`.
2. On **Billing lines**, with filters applied, show count of detail lines and sum of `amount`.

#### AR-C — Monthly Summary Excel
1. On **Monthly summary** with ≥1 row, **Download Excel** produces `.xlsx`.
2. **Then** sheet includes at minimum: Invoice, Client, Due date (MM/DD/YYYY), Grand total, Payment status, Coverage/billing dates **ASSUMPTION:** columns match current summary table + expanded meta (VATex, VAT, deductions, 2307 status).
3. **Then** exported row count equals visible filtered rows.

#### AR-D — Monthly Sales Report Excel
1. Separate button **“Monthly sales report”** (or export type dropdown) for same month filter.
2. **Then** file downloads with accounting-oriented column set **ASSUMPTION:** one row per `ar_summaries` invoice: client, invoice_no, invoice_date, due_date, total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount, total_after_ewt, deductions_total, grand_total, payment_status (suitable to email manually to accounting firm).
3. File name includes `YYYY-MM` and `sales-report`.

---

### ASSUMPTIONS (missing PDF / Excel samples)

| Item | Assumption |
|------|------------|
| **Jea** | Same account as seeded `admin` / `admin123`; no new user unless CEO prefers a `jea` staff user promoted to admin. |
| **PDF status labels** | FOR REVIEW / CREATE CHECK / FOR CHECK DEPOSIT / FOR CHECK RELEASE / DEPOSITED / RELEASED map to existing `payable_statuses` names (case-insensitive). |
| **Multiple PDCs (AP-A)** | Captured as multiple **custom fields** on Create Check status(es), or multi-value UI writing to `payable_status_field_values`; not separate payables. |
| **Jeanette final step** | If **Check Released** is terminal `paid`, Jeanette’s PDF step is **Check Deposited** when method is deposit; release path ends at **Check Released** with Jeanette confirming. |
| **Monthly Summary Excel** | Layout mirrors on-screen summary + expanded financial meta (`ReceivablesBillingPage` `SummaryRow` fields). |
| **Monthly Sales Report** | Flat per-invoice rollup for external accountants; no client-specific template beyond `ar_summaries` columns. |
| **AR date format scope** | MM/DD/YYYY on AR routes only; payables may keep existing `formatDate` unless CEO wants global change. |
| **Invoice search** | Substring match on `invoice_no` (API already supports exact `invoiceNo` and `search` on details). |

---

### Risks
| Risk | Mitigation |
|------|------------|
| Same-day delivery vs net-new AR exports | Reuse `xlsx` client export pattern; no new server dependency. |
| `resolveCreateStatus` / **For review** mismatch | Fix in first eng slice; blocks AP-C. |
| Role matrix disabled in UI (`payable_status_ids: []` on save) | Seed + server enforcement without requiring Users UI rework today. |
| Exclusive default status binding (027) | Only one user per workflow status — align Jeanette/Crissa bindings in migration to avoid Users conflicts. |
| PDC multi-value not in schema | Use existing `payable_status_custom_fields` (max 20 per status). |

### Decisions for CEO
- **None blocking** if **Jea = admin** and Excel layouts per ASSUMPTIONS are acceptable.
- Optional: confirm display name for admin (“Jea”) and whether Monthly Sales Report needs a fixed third-party column order before client send.

### Handoffs

- **Engineer:** Implement brief AC in `jpa-ap-tracker` only; fix `resolveCreateStatus` → **For review**; seed `user_payable_default_statuses` + enforce `payable_status_ids` on status PATCH/window bulk; AP-A PDC fields; AR exports (`xlsx`); `formatDateUS` for AR; invoice text search; summary totals bar; comma display audit.
- **Designer:** Minimal — invoice search input, totals strip, two export buttons, MM/DD/YYYY in AR tables (**ASSUMPTION:** no new nav).
- **Marketer:** N/A (internal ops tool).
- **Finance:** Validate exported sales report columns match what accounting firm expects once sample file reviewed.

### Prioritization (Impact/Effort — ship order today)
1. **For review** default + workflow/role fixes (blocks all AP) — H/H  
2. **AP-B** bulk check reference (mostly exists) — H/L  
3. **AP-A** multi-PDC capture — H/M  
4. **AR-A/B** search, dates, totals — H/M  
5. **AR-C/D** Excel downloads — H/M  
6. **AP-D** comma pass — M/L  