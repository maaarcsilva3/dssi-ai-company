# DSSI Proposal — GBPI Legal Contract Operations Pilot

**To:** Senior Paralegal / Legal Department, Gardenia Bakeries Philippines Inc.  
**From:** DSSI  
**Date:** 2026-11-21  
**Engagement:** Operational Gap Audit → Fixed Pilot Package

---

## 1. Executive summary

GBPI Legal already runs a disciplined contract process across entities and departments—Excel repositories, Google Docs drafting, email coordination, and printed LEG-FORM-5 routing. The gap is not legal judgment; it is **operational visibility**: where a matter sits, who holds custody, which file is current, and when contracts expire.

DSSI proposes a two-step engagement:

1. **Operational Gap Audit** — evidence-backed findings, workflow map, prioritized backlog.  
2. **Fixed pilot package** — a greenfield web app for intake, assignment pool, status, repository pointers, and expiry alerts, with **light assistive AI**, while **keeping Google Docs and wet-ink routing**.

This is **not** a 12-month CLM rip-and-replace.

---

## 2. What we heard (discovery)

Recurring gaps from the Legal working session:

- Hard to track location, status, and movement of contracts  
- No centralized validity / expiry monitoring  
- Hard to find the latest or original copy  
- Historical retrieval is time-consuming  
- Stakeholders lack live status visibility  
- Notifications rely mainly on email  

Current tools observed: multi-entity / multi-department contract repositories, per-attorney task trackers, LEG-FORM-5 review/routing template, Google Docs for drafting.

---

## 3. Proposed solution (pilot MVP)

### A — Intake, status, assignment

- Department intake form (entity, type, counterparty, attachments, Google Doc link)  
- Status workflow from Submitted → Completed (with On Hold)  
- Assignment **pool** (claim / assign)  
- Physical custody field (who holds the printed path)  
- Audit trail; requester status timeline + email on change  

### B — Repository + expiry

- One canonical matter record + latest artifact pointer  
- Entity / department access control  
- Effectivity / expiry fields; Near expiry (≤90 days)  
- Email alerts at 90 / 30 / 7 days + weekly digest  
- Search/filter; thin bootstrap import for the pilot cohort  

### Light AI (assistive only)

- Status summaries for requester updates  
- Expiry risk flags (missing dates, near expiry without owner)  
- Metadata search assist  
- Prefill LEG-FORM-5 routing PDF fields from intake  
- On-request date/party highlights on uploaded text/PDF  

**Guardrails:** no legal advice, no auto-approval, no AI-driven status changes. Disclaimers in UI.

### Routing

- **Print-first:** generate LEG-FORM-5-style PDF; record “printed copy issued” before Internal Review  
- **Optional digital routing:** feature-flagged; **off by default** in the live pilot  

### Explicitly out of pilot scope

Labor / criminal / civil case trackers; full CLM; replacing Google Docs; mandatory end of wet-ink; performance rankings.

---

## 4. Pilot footprint (to confirm)

| Item | Working assumption |
| --- | --- |
| Entities | 1–2 (e.g. GBPI + one subsidiary) |
| Departments | 2–3 (e.g. Purchasing, Marketing) |
| Legal users | ≤8 |
| Duration | 4–8 week build + 2–4 week supervised use |

---

## 5. Success measures

- Champion completes real intakes in the app (not only shadow Excel)  
- Requesters see status without waiting on Legal email  
- Dated pilot contracts receive pre-expiry alerts  
- Written “proceed” from senior paralegal → Legal Manager demo → Execom readout path  

---

## 6. Commercial

| Item | Amount (ASSUMPTION) |
| --- | --- |
| **Fixed pilot package** | **PHP 1,550,000** (~USD 26,700 @ 58 PHP/USD) |
| Includes | Gap Audit + MVP build + onboard + hypercare + readout |
| Suggested split | Audit PHP 350k · Build PHP 950k · Hypercare/readout PHP 250k |
| Payment | 40% kickoff / 40% UAT / 20% readout |
| Tax | Quoted **ex-VAT** unless agreed otherwise |
| Phase 2 | Multi-entity rollout priced separately (indicative from PHP 1.2M) |

Floor / stretch and change-order rules live in the SOW.

---

## 7. How we work together

1. Champion scope session (entities, import source, LEG-FORM-5 template, AI policy)  
2. Gap audit kickoff + week-2 vertical slice demo (intake → pool → assign → timeline)  
3. Complete pilot build (print routing, expiry, search, assistive AI)  
4. Supervised use on real pilot matters  
5. Champion sign-off → Legal Manager demo → Execom readout  

---

## 8. Next ask

**Book a 30-minute scope walkthrough** with the senior paralegal champion to confirm pilot footprint and share the gap-audit plan.

---

*DSSI — Operational Gap Audit · Legal Contract Ops (pilot)*  
*Internal package path: `company-workspace/gardenia-legal-pilot/`*
