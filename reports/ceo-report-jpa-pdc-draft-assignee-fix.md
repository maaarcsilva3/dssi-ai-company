## Objective
Fix remaining jpa-ap-tracker bugs: PDC cleared after draft save/edit, and Save and submit 403 “not assigned to you” for the creator.

## What we did
- **COO:** Reproduced against live Docker DB/API; confirmed drafts had 0 `payable_pdc_lines` while API persist worked when body included lines; confirmed draft submit 403 from null assignee.
- **Engineer:** Server + client fixes; tests; Docker rebuild/recreate.

## Deliverables
| Title | Path |
|-------|------|
| Fix + notes | `jpa-ap-tracker/tech-notes-pdc-draft-assignee-fix.md` |

### Root causes
1. **Assignee 403:** Drafts are stored with `assigned_to = null`. Save and submit changes status → assignee check failed even for the creator.
2. **PDC loss:** Saving a draft often sent empty/missing `pdc_lines`; server DELETE-then-insert wiped any rows. Prior “fix” did not stop that wipe path.

### Fixes
- Skip assignee check on draft→submit (creator already passed edit ACL).
- Preserve PDC on draft when payload is empty; client always sends real PDC lines for Post Dated Check, auto-seeds a row, filters blank amounts.

### Verified
- API: draft + PDC survives refetch; empty `pdc_lines` on draft PUT no longer deletes; Jeanette Save and submit → **For review**, assigned to self.
- `npm test` 58 PASS; app healthy on http://127.0.0.1:8080/

## Decisions needed
None blocking.

## Next steps
1. Hard-refresh http://127.0.0.1:8080/
2. New draft: Post Dated Check → fill PDC amounts (sum = net) → Save Draft → reopen → confirm PDC still there → Save and submit.
3. Tell us if any old drafts from before this fix still lack PDC (those never got rows in DB).
