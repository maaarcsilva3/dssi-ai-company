## Objective
Keep both PDC patterns and allow mix on one payable: per-invoice (1+ PDCs) and shared (many invoices → one PDC). One row per invoice; shared edit via popup listing attached invoices. Poteto-mode; rebuild Docker.

## What we did
- **COO:** Locked assumptions (mix, one check per shared group, multi groups, Docker); poteto-mode yes; verified tests/Docker after ship.
- **Engineer (poteto-agent):** Migration 037, API, SharedPdcModal, proofs, Docker rebuild.

## Deliverables
| Title | Path |
|-------|------|
| Shared + per-invoice PDC | `jpa-ap-tracker/` + `tech-notes-pdc-shared-and-per-invoice.md` |
| Proof | `scripts/prove-pdc-shared.mjs` |

### How to use
1. Hard-refresh http://127.0.0.1:8080/
2. Payable with 2+ invoices, method Post Dated Check.
3. Per-invoice: enter PDC lines under that invoice (sum = invoice net).
4. Shared: on a row, **Share one PDC with other invoices…** → modal pick invoices → one PDC no/date; amount = sum of selected nets.
5. Shared rows show summary + **Edit shared PDC…** / **Use own PDC schedule**.

### Verified
78/78 tests; shared API proof 19/19; app healthy on :8080 (037 applied).

## Decisions needed
None blocking.

## Next steps
1. Smoke the shared modal once in the browser (attach 2 invoices, save draft, reopen).
2. Confirm mixed payable: one invoice with own PDCs + two on a shared check.
