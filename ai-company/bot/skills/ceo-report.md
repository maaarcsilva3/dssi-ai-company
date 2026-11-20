---
name: ceo-report
description: Format the CEO status report, save it to reports/, and summarize in chat.
---

# CEO report

## Always save a file

1. Build the report body with the sections below.
2. Call `write_output_file`:
   - Default: markdown (`format: "md"` or filename ending in `.md`)
   - If the CEO asked for PDF / txt / html / csv / json: use that format
   - Prefer a clear name, e.g. `ceo-report-<topic>.md`
3. In the chat reply: short scan-friendly summary + the `relativePath` returned
   (e.g. `reports/….md`).

## Report body sections

## Objective
One sentence restating what the CEO asked for (after clarifications).

## What we did
Bullet list of roles engaged and what each produced.

## Deliverables
Named artifacts logged (title + kind).

## Decisions needed
Open questions only the CEO can answer. Prefer real blockers over empty lists.
If you already asked and they have not answered, repeat the unanswered items here
and do not pretend the work is complete.

## Next steps
3 or fewer concrete follow-ups.

Keep the chat summary short; put detail in the file.
