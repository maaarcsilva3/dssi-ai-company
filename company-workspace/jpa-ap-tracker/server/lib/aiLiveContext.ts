import { pool } from '../db';
import { getSettings, todayForApp } from '../routes/settings';
import { addDays, nextReleaseDate, releaseWindow } from './releaseWindow';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Snapshot of live statuses / people / accounts / release window injected into every AI prompt. */
export async function loadAiLiveContext(): Promise<string> {
  const [statuses, customFields, defaultAssignees, assignees, accounts, settings, today] =
    await Promise.all([
      pool.query<{
        id: number;
        name: string;
        category: string;
        sort_order: number;
        require_file: boolean;
      }>(
        `SELECT id, name, category, sort_order, require_file
           FROM payable_statuses
          WHERE active
          ORDER BY sort_order, id`,
      ),
      pool.query<{
        id: number;
        status_id: number;
        label: string;
        field_type: string;
        show_in_list: boolean;
      }>(
        `SELECT cf.id, cf.status_id, cf.label, cf.field_type, cf.show_in_list
           FROM payable_status_custom_fields cf
           JOIN payable_statuses s ON s.id = cf.status_id
          WHERE s.active
          ORDER BY cf.status_id, cf.sort_order, cf.id`,
      ),
      pool.query<{
        status_id: number;
        status_name: string;
        sort_order: number;
        user_id: number;
        display_name: string;
        username: string;
      }>(
        `SELECT d.status_id, s.name AS status_name, s.sort_order, d.user_id, u.display_name, u.username
           FROM user_payable_default_statuses d
           JOIN payable_statuses s ON s.id = d.status_id
           JOIN users u ON u.id = d.user_id
          WHERE s.active AND u.active
          ORDER BY s.sort_order, s.id, u.id`,
      ),
      pool.query<{ id: number; display_name: string; username: string; role: string }>(
        `SELECT id, display_name, username, role
           FROM users
          WHERE active AND role IN ('admin', 'staff')
          ORDER BY display_name, id`,
      ),
      pool.query<{ id: number; bank_name: string; account_number: string }>(
        `SELECT id, bank_name, account_number
           FROM source_accounts
          WHERE active
          ORDER BY bank_name, account_number, id`,
      ),
      getSettings(),
      todayForApp(),
    ]);

  // Same rules as GET /releases/upcoming
  const thisReleaseDate = nextReleaseDate(today, settings.release_weekday);
  const nextReleaseCycleDate = nextReleaseDate(addDays(thisReleaseDate, 1), settings.release_weekday);
  const thisWindow = releaseWindow(thisReleaseDate, settings.days_before, settings.days_after);
  const nextWindow = releaseWindow(nextReleaseCycleDate, settings.days_before, settings.days_after);

  const fieldsByStatus = new Map<number, typeof customFields.rows>();
  for (const field of customFields.rows) {
    const list = fieldsByStatus.get(field.status_id) ?? [];
    list.push(field);
    fieldsByStatus.set(field.status_id, list);
  }

  const statusLines = statuses.rows.length
    ? statuses.rows
        .map((s) => {
          const fields = fieldsByStatus.get(s.id) ?? [];
          const fieldPart = fields.length
            ? `; custom_fields=[${fields
                .map((f) => `id=${f.id} "${f.label}" (${f.field_type})`)
                .join(', ')}]`
            : '';
          const filePart = s.require_file ? '; require_file=true' : '';
          return `- id=${s.id} "${s.name}" (category=${s.category})${filePart}${fieldPart}`;
        })
        .join('\n')
    : '- (none configured)';

  const defaultAssigneeLines = defaultAssignees.rows.length
    ? defaultAssignees.rows
        .map((d) => {
          const anytime = d.sort_order === 0 ? '; anytime/multi-ok' : '; exclusive';
          return `- status "${d.status_name}" (id=${d.status_id}${anytime}) → ${d.display_name} (username=${d.username}, user_id=${d.user_id})`;
        })
        .join('\n')
    : '- (none configured)';

  const assigneeLines = assignees.rows.length
    ? assignees.rows
        .map((u) => `- id=${u.id} "${u.display_name}" (username=${u.username}, role=${u.role})`)
        .join('\n')
    : '- (none)';

  const accountLines = accounts.rows.length
    ? accounts.rows
        .map((a) => `- id=${a.id} ${a.bank_name} · ${a.account_number}`)
        .join('\n')
    : '- (none)';

  return `## Live reference data (from the database — always prefer this over guesses)

### App "today" and Upcoming Release windows
- today = ${today} (settings.timezone = ${settings.timezone})
- release_weekday = ${settings.release_weekday} (${WEEKDAYS[settings.release_weekday] ?? '?'})
- days_before = ${settings.days_before}, days_after = ${settings.days_after}, include_overdue = ${settings.include_overdue}
- ar_due_days = ${settings.ar_due_days} (default AR due_date = invoice_date + ar_due_days)

**This release cycle** (default Upcoming Release screen / “this week’s release”):
- releaseDate = ${thisWindow.releaseDate}
- windowStart = ${thisWindow.windowStart}
- windowEnd = ${thisWindow.windowEnd}

**Next release cycle** (when the admin says “next week”, “next Friday”, or “next release”):
- releaseDate = ${nextWindow.releaseDate}
- windowStart = ${nextWindow.windowStart}
- windowEnd = ${nextWindow.windowEnd}

### Upcoming Release query (MUST match the web app)
Do **not** invent a Monday–Sunday calendar week. Use the windows above.

Always run **two** queries for Upcoming Release / “this week’s release” / “next week”:
1) totals (count + sum), 2) one page of **10** detail rows. Never SELECT hundreds of detail rows.

**Default** (matches web Upcoming Release when include_overdue=${settings.include_overdue}):
open, not draft, \`due_date <= windowEnd\`, and (\`due_date >= windowStart\` OR include_overdue).

**Exclude overdue** — when the admin says “don’t include overdue”, “exclude overdue”, “only this week”, “in window only”, or similar:
drop the overdue OR clause. Require \`due_date >= windowStart AND due_date <= windowEnd\`.
Keep that preference for later “next 10” in the same chat unless they ask to include overdue again.

This cycle — totals (default / with overdue when settings allow):
\`\`\`sql
SELECT count(*)::int AS payable_count,
       coalesce(sum(p.amount), 0)::text AS total_amount,
       count(*) FILTER (WHERE p.due_date < '${thisWindow.windowStart}')::int AS overdue_count,
       coalesce(sum(p.amount) FILTER (WHERE p.due_date < '${thisWindow.windowStart}'), 0)::text AS overdue_amount,
       count(*) FILTER (WHERE p.due_date >= '${thisWindow.windowStart}')::int AS in_window_count,
       coalesce(sum(p.amount) FILTER (WHERE p.due_date >= '${thisWindow.windowStart}'), 0)::text AS in_window_amount
FROM payables p
JOIN payable_statuses s ON s.id = p.status_id
WHERE COALESCE(p.is_draft, false) = false
  AND p.due_date <= '${thisWindow.windowEnd}'
  AND s.category = 'open'
  AND (p.due_date >= '${thisWindow.windowStart}' OR ${settings.include_overdue})
\`\`\`

This cycle — totals **excluding overdue**:
\`\`\`sql
SELECT count(*)::int AS payable_count,
       coalesce(sum(p.amount), 0)::text AS total_amount
FROM payables p
JOIN payable_statuses s ON s.id = p.status_id
WHERE COALESCE(p.is_draft, false) = false
  AND p.due_date >= '${thisWindow.windowStart}'
  AND p.due_date <= '${thisWindow.windowEnd}'
  AND s.category = 'open'
\`\`\`

This cycle — detail page (batch of 10). OFFSET 0 first page; OFFSET 10 / 20 / … for “next 10”.
Default filter ends with \`(p.due_date >= '${thisWindow.windowStart}' OR ${settings.include_overdue})\`.
Exclude-overdue filter: \`p.due_date >= '${thisWindow.windowStart}' AND p.due_date <= '${thisWindow.windowEnd}'\`.
\`\`\`sql
SELECT p.id, p.invoice_no, p.due_date, p.amount::text AS amount,
       s.name AS status_name, s.category AS status_category, c.name AS supplier
FROM payables p
JOIN payable_statuses s ON s.id = p.status_id
JOIN clients c ON c.id = p.client_id
WHERE COALESCE(p.is_draft, false) = false
  AND p.due_date <= '${thisWindow.windowEnd}'
  AND s.category = 'open'
  AND (p.due_date >= '${thisWindow.windowStart}' OR ${settings.include_overdue})
ORDER BY p.due_date, p.id
LIMIT 10 OFFSET 0
\`\`\`

Next cycle (“next week” / “next Friday” / “next release”) — same pattern with
windowStart \`'${nextWindow.windowStart}'\` and windowEnd \`'${nextWindow.windowEnd}'\`.

Short follow-ups (“don’t include overdue”, “next 10”, “more”) **must** set needsQuery=true and re-run totals + detail with the right window + OFFSET. Do not answer from memory alone.

When listing: show **only the 10 detail rows**. Lead with totals (counts and ₱ amounts). Say how many remain and that they can ask for “next 10”.
Never say “₱X are overdue” for a count — use overdue_count / overdue_amount separately.

### Live payable statuses (use these exact names / ids)
${statusLines}

Rules:
- When talking about a payable's current status, use the status name returned by SQL (join payable_statuses), not a remembered or invented name.
- When proposing a status change, set statusName to one of the exact names above (or statusId).
- If require_file=true or custom_fields are listed, still propose the status change — the server will ask for each field and for a file (Telegram photo/PDF or web Attach file).
- proposedAction.payableId = payables.id from the SELECT (column \`id\`). Never use 1, 2, 3 from a numbered reply list. Prefer invoiceNo alongside payableId.
- Phrases like “ready for check creation” / “move to check creation” mean statusName = the Create Check for Deposit status above.

### Default status assignees (sort_order>0 exclusive; sort_order=0 multi-user)
${defaultAssigneeLines}

### Live assignees (for “assign to …”)
${assigneeLines}

### Live source accounts (required when moving to Create Check for Deposit)
${accountLines}

### Module coverage reminder
You can SELECT (read-only) AP payables, AR logistics billing (\`ar_*\`), source accounts, liquidations / liquidation_lines, truck_allowances (petty cash), users/permissions, and status custom-field values. Prefer querying the live tables over saying data is unavailable.
`;
}
