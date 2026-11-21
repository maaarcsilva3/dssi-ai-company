# GBPI Legal Department — Pilot MVP Product Brief

**Client:** Gardenia Bakeries Philippines Inc. (GBPI) Legal Department  
**Engagement frame:** DSSI **Operational Gap Audit** → fixed-scope **pilot package** (Finance to price)  
**Evidence:** meeting notes + `LEGAL - Contract Repository 2025-2026.xlsx`, per-attorney task trackers, `Summary of Legal Dept Trackers.xlsx`, `LEG-FORM-5` routing/review template  
**Duration ASSUMPTION:** 4–8 week pilot build + 2–4 week supervised use before Execom readout

---

## Problem (one sentence)

Legal’s contract work is fragmented across entity/department Excel trackers, Google Docs, email, and printed routing slips—so nobody can reliably answer *where a contract is, who owns it, which copy is current, or when it expires* without manual chase.

---

## User / JTBD

| Tier | User | Job to be done |
| --- | --- | --- |
| **Primary** | **Senior paralegal** (pilot champion) | Stop reconciling spreadsheets; run intake → assign → status from one queue; prove the team can pilot before asking Legal Managers for budget. |
| **Primary** | **Assigned legal staff** (attorneys/paralegals) | Pull work from a fair pool, update status once, link the canonical record and routing metadata—without replacing Google Docs drafting or wet-ink review. |
| **Primary** | **Department requesters** (Purchasing, Marketing, HR, etc.) | Submit a contract request, see live status, get notified—without emailing Legal for “where is my contract?” |
| **Secondary** | **Legal Managers** | Portfolio view: workload, bottlenecks, expiry risk, audit trail for standards (NDA, lease, SA, etc.). |
| **Secondary** | **Executive Committee** | Confidence that contract risk and renewal exposure are visible—not buried in sheets per entity (GBPI, Nutribaked, Philfoods, Vitabread, Nutrimax, PFPI, GTDC, …). |
| **Buyer (DSSI)** | **CEO / DSSI** | Win pilot approval + Execom intro via credible gap audit + thin demo, not a 12-month CLM rip-and-replace pitch. |

**Workflow anchor (from meeting):** dept submit → Legal assign (pool) → Google Docs draft/comments → routing slip + **printed** copy → internal review cycles → final approval → notarization if needed → return to dept.

---

## Success metrics

Aligned to CEO goal: **senior paralegal wants a pilot** → **intro to Legal Managers / Execom**.

| Type | Metric | Target (pilot window) |
| --- | --- | --- |
| **Leading — adoption** | Senior paralegal completes ≥3 real intakes in app (not shadow Excel) | 100% of pilot cohort requests |
| **Leading — visibility** | Requester opens status page without Legal email reply | ≥70% of pilot requests (ASSUMPTION: n≥10 requests) |
| **Leading — champion** | Written “proceed to pilot” from senior paralegal (email/form) | Yes / No (gate for Execom intro) |
| **Leading — manager interest** | Legal Manager attends demo + scores usefulness ≥4/5 | ≥1 manager, one session |
| **Lagging — time** | Median time to answer “status + location + latest copy pointer” | ≥30% faster vs. baseline self-report (ASSUMPTION: 2-week baseline sample) |
| **Lagging — expiry** | Contracts with end date in pilot repo receive alert before expiry | 100% of dated records in pilot set |
| **Lagging — retrieval** | Historical lookup (title/counterparty/entity) to correct record | ≤2 minutes median in pilot test script (n≥5 scenarios) |
| **Commercial** | Execom or Legal Manager intro meeting scheduled | ≥1 within 30 days of champion yes |
| **Proxy / UNKNOWN** | Full contract volume per month | UNKNOWN — instrument during pilot |

---

## Scope

### Commercial wrapper (for proposal)

| Element | Content |
| --- | --- |
| **Offer name** | DSSI Operational Gap Audit — **GBPI Legal Contract Operations** |
| **Outputs** | Gap findings memo (evidence-backed), current-state workflow map, prioritized backlog, **pilot MVP** (this scope), demo script, success readout template |
| **Pilot** | Fixed package: build + onboard + 2–4 week hypercare + readout deck for Legal Managers / Execom |
| **Pricing** | **NEEDS Finance** — fixed pilot fee + optional extension; no budget band from CEO |

### Must-have — Pilot MVP (thin A + B + light AI)

**Pilot population ASSUMPTION:** 1–2 entities (e.g. GBPI + one subsidiary), 2–3 departments (e.g. Purchasing, Marketing), ≤8 legal users, all contract *types* allowed but **case/labor/criminal/civil trackers excluded**.

#### A — Contract intake, status, assignment pool (Impact: High / Effort: Medium)

| # | Capability | Notes |
| --- | --- | --- |
| A1 | Intake form | Entity, dept, contract type, counterparty, proponent, priority, attachments (PDF/DOCX), link to Google Doc (URL field) |
| A2 | Status model | Minimum: `Submitted` → `In Pool` → `Assigned` → `Drafting` → `Internal Review` → `Final Approval` → `Notarization` → `Completed` / `On Hold` |
| A3 | Assignment pool | Unassigned queue; claim/assign; optional round-robin hint (ASSUMPTION: manual assign v1) |
| A4 | Location / custody | “Physical: with [role/name]” + optional desk/shelf note; mirrors printed routing reality |
| A5 | Stakeholder visibility | Requester + Legal see status timeline; email notification on status change (in-app optional ASSUMPTION) |
| A6 | Audit trail | Who changed status/when; no performance rankings in pilot (deferred—high politics / low pilot value) |

#### B — Repository + expiry alerts (Impact: High / Effort: Medium)

| # | Capability | Notes |
| --- | --- | --- |
| B1 | Canonical record per matter | One contract “folder”: metadata + pointer to latest file (upload or link); mark *system of record* vs. *draft in GDocs* |
| B2 | Entity + dept ACL | Requesters see own dept; Legal sees all in pilot entities; Managers see portfolio |
| B3 | Expiry fields | Effectivity start/end (or term length); status: Active / Near expiry (≤90d) / Expired / Unknown |
| B4 | Alerts | Email digest (weekly) + alert at 90/30/7 days (configurable ASSUMPTION: fixed thresholds in v1) |
| B5 | Search | Filter by entity, dept, type, counterparty, status, assignee, expiry bucket; keyword on title/metadata |
| B6 | **Thin** import | CSV/XLSX import wizard for **one** entity sheet OR ≤200 rows manual bootstrap (ASSUMPTION: paralegal supplies export) |

#### Light AI — Assistive only (Impact: Medium / Effort: Low–Medium)

**Guardrail:** No legal advice, no auto-approval, no replacement of attorney judgment; disclaimers in UI.

| # | Capability | Notes |
| --- | --- | --- |
| AI1 | Status summary | One-click plain-language summary of timeline + open blockers for requester email |
| AI2 | Expiry risk flag | Highlight missing end date, conflicting dates, “near expiry” with no owner |
| AI3 | Search assist | Natural-language query → suggested filters / record list (metadata only unless CEO approves doc text indexing) |
| AI4 | Routing-slip metadata draft | Pre-fill LEG-FORM-5–style fields from intake (company, type, proponent, reviewers list ASSUMPTION: static GBPI template) |
| AI5 | Clause/risk highlight | **On explicit user request** on uploaded PDF/text: highlight dates, parties, termination—not legal conclusions |

#### Wet-ink + optional digital routing (Impact: Medium / Effort: Low)

| # | Capability | Notes |
| --- | --- | --- |
| R1 | Print-first routing | Generate printable routing slip (PDF) matching LEG-FORM-5 sections; wet signature blocks |
| R2 | Physical milestone | Status cannot advance past `Internal Review` without recording “printed copy issued” (checkbox + date) |
| R3 | **Feature flag** `digitalRoutingSlipEnabled` | When OFF (default): digital capture is read-only/PDF only. When ON: capture e-signatures or approval clicks per step (ASSUMPTION: simple click-to-approve, not full e-sign vendor) |

### Later (post-pilot / v2)

| Item | I/E |
| --- | --- |
| Full multi-entity rollout + dept repos for all sheets in `LEGAL - Contract Repository` | High / High |
| Google Docs API live co-editing, comment sync | Medium / High |
| Performance/workload rankings | Low / Medium |
| In-app real-time notifications (beyond email) | Medium / Medium |
| Automated workflow rules, SLA timers | Medium / Medium |
| Full digital routing + e-sign integration | Medium / High |
| ISO audit evidence packs from app | Medium / Medium |
| Mobile app | Low / High |

### Out of scope (pilot)

- **Case management** — labor, criminal, civil, and non-contract legal trackers in `Summary of Legal Dept Trackers.xlsx` (SSA/TMA/SEC/BIR databases, etc.) unless CEO expands scope.
- Replacement of Google Docs as drafting surface.
- Mandatory elimination of wet-ink routing (pilot keeps print path).
- Full CLM: redlining AI, playbook automation, billing, vendor portal.
- Integration with Gardenia ERP/HRIS (UNKNOWN if needed).
- User performance leaderboards in pilot.
- DSSI choosing production cloud region / GBPI IT security sign-off (NEEDS GBPI IT + CEO).

---

## Impact / Effort prioritization (pilot build order)

| Priority | Slice | Rationale |
| --- | --- | --- |
| P0 | A1–A5 intake + status + pool | Directly addresses pain #1, #5; demoable in week 2 |
| P0 | B1, B3–B5 record + expiry + search | Addresses pain #2, #3, #4 |
| P1 | R1–R2 print routing + physical milestone | CEO must-have; trust with Legal culture |
| P1 | B4 alerts + B6 thin import | Makes repository credible vs. Excel |
| P2 | AI1, AI2, AI4 | High demo value, low risk |
| P2 | R3 digital routing (flag off) | Optional path without forcing change |
| P3 | AI3, AI5 | Depends on doc indexing policy |

---

## Acceptance criteria (testable)

### A — Intake, status, assignment pool

1. **AC-A1:** Requester submits intake with required fields; system assigns human-readable ID; email confirms receipt within 1 minute (ASSUMPTION: SMTP configured).
2. **AC-A2:** New submission appears in `In Pool` within 5 seconds; Legal user with role `assigner` can assign or staff can `claim` one item; pool count decrements.
3. **AC-A3:** Status transitions enforce allowed edges; illegal transition returns error and does not write audit row.
4. **AC-A4:** Requester dashboard shows current status and last 10 events without waiting on Legal email (ASSUMPTION: requester account login; optional magic-link token later).
5. **AC-A5:** Custody field update appears in audit log with user id and timestamp.

### B — Repository + expiry

1. **AC-B1:** Each matter has exactly one canonical metadata record; “latest artifact” link or file version is visible to Legal.
2. **AC-B2:** User in dept A cannot open matter owned by dept B (403); Legal Manager can list all matters in pilot entity.
3. **AC-B3:** Record with end date in 60 days appears in `Near expiry` list and weekly digest.
4. **AC-B4:** Search for counterparty substring returns correct matter in &lt;3s for pilot dataset (≤500 records ASSUMPTION).
5. **AC-B5:** Import of 50-row CSV creates 50 matters with mapped columns; failed rows reported in error report without partial silent drop.

### Light AI

1. **AC-AI1:** Status summary contains no hallucinated dates; every date in summary exists in audit trail (manual QA sample n=10).
2. **AC-AI2:** Record with end date blank and type=Lease flags `missing_expiry` in UI and digest.
3. **AC-AI3:** AI search returns empty with message when no match—not fabricated matters.
4. **AC-AI4:** Routing PDF fields match intake submission for company, type, proponent (visual diff checklist).
5. **AC-AI5:** Clause highlight runs only after explicit button click; UI shows “assistive only” disclaimer.

### Wet-ink + optional digital routing

1. **AC-R1:** With flag OFF, routing slip is PDF printable; no digital signature fields accept input.
2. **AC-R2:** Transition to `Internal Review` requires `printed_copy_issued=true` and date.
3. **AC-R3:** With flag ON in staging, approver can record approval per row; audit captures approver id; print layout unchanged for users who still print.

### Pilot exit / commercial

1. **AC-P1:** Senior paralegal sign-off form captured (name, date, proceed Y/N).
2. **AC-P2:** Gap audit memo lists ≥5 findings mapped to evidence files from meeting package.
3. **AC-P3:** Demo script completes in ≤25 minutes covering intake → pool → print slip → expiry alert → search.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Excel remains source of truth during pilot | Parallel run for 2 weeks; import bootstrap; champion commits to “no new rows in shadow sheet” for pilot matters |
| Multi-entity ACL complexity | Cap pilot entities; role model: Requester / Legal / Manager / Admin |
| Google Docs still canonical for text | App stores pointers + uploaded snapshots at milestones only (ASSUMPTION) |
| AI overreach / compliance | Assistive copy, human-in-loop, no auto status changes from AI |
| GBPI IT security / hosting | NEEDS CEO + GBPI IT: on-prem vs. cloud, data residency Philippines ASSUMPTION |
| Adoption by attorneys | Pool optional; assigner retains override; no rankings in pilot |
| Scope creep from “Expected System Capabilities” list | Ruthless A+B+light AI; backlog slide for everything else |

---

## Decisions for CEO

| # | Decision | Status |
| --- | --- | --- |
| 1 | Pilot entity/department list (recommend GBPI HQ + Purchasing + Marketing) | **NEEDS CEO** confirm with Gardenia champion |
| 2 | May pilot index full contract PDF text for AI5, or metadata-only? | **NEEDS CEO** (+ GBPI counsel) |
| 3 | Hosting: GBPI-managed vs. DSSI-hosted demo tenant | **UNKNOWN** |
| 4 | Auth: GBPI SSO vs. email/password pilot | **NEEDS CEO** |
| 5 | Import: which single Excel tab is migration source of truth for demo data? | **NEEDS CEO** / paralegal |
| 6 | Digital routing flag: enable for demo only or stay off until post-pilot? | **RECOMMEND:** off in production pilot; on in DSSI demo |
| 7 | Case management expansion (labor/criminal/civil trackers) | **Out of scope** unless CEO expands |

---

## Handoffs

### Engineer

- Greenfield web app: multi-tenant-ready **ASSUMPTION** but single client config for pilot.
- Core entities: `Matter`, `Intake`, `Assignment`, `Artifact`, `RoutingSlip`, `User`, `Entity`, `Department`, `AuditEvent`, `AlertRule`.
- Feature flag: `digitalRoutingSlipEnabled`.
- Email notifications (status + digest); PDF generation for LEG-FORM-5 layout.
- Light AI: pluggable provider; strict prompts; no tool calls that mutate status without user confirm.
- CSV import for bootstrap; no Google Docs API in P0.
- Stack: **NEEDS CEO** — propose boring monolith + managed DB + object storage for attachments.

### Designer

- Flows: requester submit → thank-you/status; Legal pool + claim; matter detail with timeline + custody + print routing.
- Empty states for pool and search; expiry dashboard for Managers.
- Print stylesheet matches familiar LEG-FORM-5 rows (Prepared/Reviewed/Approved/Remarks).
- Disclaimers for AI surfaces; bilingual **UNKNOWN** (English ASSUMPTION unless CEO says Tagalog).

### Marketer

- Proposal narrative: **Operational Gap Audit** (not “AI will replace Legal”).
- One-pager: pain quotes from meeting notes; before (Excel/email/print) vs. after (single status + expiry).
- Demo storyboard tied to AC-P3; appendix defers rankings, full CLM, case trackers.
- Execom slide: risk reduction (expiry visibility), not feature laundry list.

### Finance

- Package: Gap Audit (fixed days) + Pilot Build (4–8 wks) + Hypercare (2–4 wks) + Readout workshop.
- Line items: discovery/workflow mapping, build, import support, training (2 sessions), success metrics readout.
- Optional: per-entity rollout phase 2 (**TBD** pricing).
- No budget band from CEO—propose 2-tier (pilot-only vs. pilot + 90-day extend) **ASSUMPTION**.

---

## Evidence index (for audit memo)

| Pain (notes) | Pilot mapping |
| --- | --- |
| Track location/status/movement | A2, A4, A5, audit trail |
| No centralized expiry monitoring | B3, B4, AI2 |
| Hard to find latest/original | B1, artifact pointer |
| Historical retrieval slow | B5, AI3 |
| Stakeholders lack visibility | A5, AI1 |
| Email-only notifications | A5, B4 |

**Explicit exclusion:** Compilation trackers for SSA/TMA/SEC/BIR and ISO audit databases are **not** in pilot MVP—reference only in gap audit as separate workstream.

---

## Proposal + demo MVP summary (CEO)

**Sell:** DSSI maps the operational gap from spreadsheets + email + print to a **thin operations layer** Legal keeps control of.  
**Show:** One intake through pool, printed routing PDF, searchable repository, expiry alert, assistive summary.  
**Ask:** Senior paralegal pilot commitment → Legal Manager demo → Execom intro for funded rollout.