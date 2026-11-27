## Objective
After Separate + One PDC for all + draft: editing any sibling keeps One-PDC-for-all mode; PDC edits sync across siblings; amounts recompute; cannot break the share. No poteto; rebuild Docker.

## What we did
- **Engineer:** Migration 038 batch link; GET `shared_pdc_batch` + members; PUT/status sync no/date + net amounts to all siblings; edit UI locked to outside One-PDC block; unlink blocked; Docker rebuild.

## Deliverables
| Title | Path |
|-------|------|
| Shared batch link | `jpa-ap-tracker/tech-notes-pdc-shared-batch-link.md` |
| Proof | `scripts/prove-pdc-shared-batch-link.mjs` |

### How to verify
1. Hard-refresh http://127.0.0.1:8080/
2. New: Separate + One PDC for all + 2 invoices → Save Draft
3. Open either payable → outside One PDC UI + both members listed
4. Change check no/date → save → open the other → same values; amounts = each net

### Note
Drafts created **before** this fix have no batch id — recreate those with One PDC for all.

## Decisions needed
None.

## Next steps
Smoke the create → edit inv1 → open inv2 path once in the browser.
