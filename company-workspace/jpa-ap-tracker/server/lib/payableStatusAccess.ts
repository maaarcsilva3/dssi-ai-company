import type { Queryable } from '../db';
import { HttpError } from './http';
import { isAdmin, type AuthUser } from './auth';

export interface PayableStatusCustomField {
  id: number;
  status_id: number;
  label: string;
  field_type: 'text' | 'date';
  show_in_list: boolean;
  sort_order: number;
}

export interface PayableStatusWorkflowRow {
  id: number;
  name: string;
  category: string;
  sort_order: number;
  active: boolean;
  require_file: boolean;
  custom_fields: PayableStatusCustomField[];
}

export async function listPayableStatusCustomFields(
  db: Queryable,
  statusId: number,
): Promise<PayableStatusCustomField[]> {
  const { rows } = await db.query<PayableStatusCustomField>(
    `SELECT id, status_id, label, field_type, show_in_list, sort_order
       FROM payable_status_custom_fields
      WHERE status_id = $1
      ORDER BY sort_order, id`,
    [statusId],
  );
  return rows;
}

export async function listPayableStatusCustomFieldsByStatusIds(
  db: Queryable,
  statusIds: number[],
): Promise<Map<number, PayableStatusCustomField[]>> {
  const map = new Map<number, PayableStatusCustomField[]>();
  if (!statusIds.length) return map;
  const { rows } = await db.query<PayableStatusCustomField>(
    `SELECT id, status_id, label, field_type, show_in_list, sort_order
       FROM payable_status_custom_fields
      WHERE status_id = ANY($1::int[])
      ORDER BY status_id, sort_order, id`,
    [statusIds],
  );
  for (const row of rows) {
    const list = map.get(row.status_id) ?? [];
    list.push(row);
    map.set(row.status_id, list);
  }
  return map;
}

export async function getPayableStatusWorkflow(
  db: Queryable,
  statusId: number,
): Promise<PayableStatusWorkflowRow> {
  const { rows } = await db.query<Omit<PayableStatusWorkflowRow, 'custom_fields'>>(
    `SELECT id, name, category, sort_order, active, require_file
       FROM payable_statuses WHERE id = $1`,
    [statusId],
  );
  if (!rows[0]) throw new HttpError(400, 'Unknown status');
  const custom_fields = await listPayableStatusCustomFields(db, statusId);
  return { ...rows[0], custom_fields };
}

export type CustomFieldInput = {
  id?: number | null;
  label: string;
  field_type: 'text' | 'date';
  show_in_list?: boolean;
  sort_order?: number;
};

/** Replace the full set of custom fields for a status (create / update / delete). */
export async function replacePayableStatusCustomFields(
  db: Queryable,
  statusId: number,
  fields: CustomFieldInput[],
): Promise<PayableStatusCustomField[]> {
  const normalized = fields.map((f, i) => ({
    id: f.id != null && Number.isFinite(Number(f.id)) ? Number(f.id) : null,
    label: String(f.label ?? '').trim(),
    field_type: f.field_type,
    show_in_list: Boolean(f.show_in_list),
    sort_order: Number.isFinite(Number(f.sort_order)) ? Number(f.sort_order) : i,
  }));

  for (const f of normalized) {
    if (!f.label) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { custom_fields: ['Each custom field needs a label'] },
      });
    }
    if (f.field_type !== 'text' && f.field_type !== 'date') {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { custom_fields: ['Custom field type must be text or date'] },
      });
    }
  }

  const keepIds = normalized.map((f) => f.id).filter((id): id is number => id != null);
  if (keepIds.length) {
    const { rows: owned } = await db.query<{ id: number }>(
      `SELECT id FROM payable_status_custom_fields
        WHERE status_id = $1 AND id = ANY($2::int[])`,
      [statusId, keepIds],
    );
    if (owned.length !== keepIds.length) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { custom_fields: ['One or more custom fields do not belong to this status'] },
      });
    }
  }

  if (keepIds.length) {
    await db.query(
      `DELETE FROM payable_status_custom_fields
        WHERE status_id = $1 AND NOT (id = ANY($2::int[]))`,
      [statusId, keepIds],
    );
  } else {
    await db.query(`DELETE FROM payable_status_custom_fields WHERE status_id = $1`, [statusId]);
  }

  for (const f of normalized) {
    if (f.id != null) {
      await db.query(
        `UPDATE payable_status_custom_fields
            SET label = $1, field_type = $2, show_in_list = $3, sort_order = $4
          WHERE id = $5 AND status_id = $6`,
        [f.label, f.field_type, f.show_in_list, f.sort_order, f.id, statusId],
      );
    } else {
      await db.query(
        `INSERT INTO payable_status_custom_fields
           (status_id, label, field_type, show_in_list, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [statusId, f.label, f.field_type, f.show_in_list, f.sort_order],
      );
    }
  }

  return listPayableStatusCustomFields(db, statusId);
}

/** Normalize request payload: map of field id → value, with legacy single-value fallback. */
export function normalizeCustomFieldValuesInput(
  fields: PayableStatusCustomField[],
  customFieldValues: Record<string, string | null | undefined> | null | undefined,
  legacySingleValue: string | null | undefined,
): Record<number, string> {
  const out: Record<number, string> = {};
  if (customFieldValues && typeof customFieldValues === 'object') {
    for (const [key, raw] of Object.entries(customFieldValues)) {
      const id = Number(key);
      if (!Number.isFinite(id)) continue;
      const value = raw == null ? '' : String(raw).trim();
      if (value) out[id] = value;
    }
  }
  if (fields.length === 1 && legacySingleValue?.trim() && out[fields[0]!.id] == null) {
    out[fields[0]!.id] = legacySingleValue.trim();
  }
  return out;
}

/**
 * Allowed destinations from a status:
 * - sort_order 0 = "anytime" (e.g. Reject) — always choosable from any step
 * - same sort_order (> 0) = sibling choices (all peers at that order)
 * - previous / next distinct sort_order groups (all statuses in each group)
 * - from sort_order 0: re-enter at the first positive sort_order group
 */
export async function listAllowedNextPayableStatusIds(
  db: Queryable,
  fromStatusId: number,
): Promise<number[]> {
  const from = await getPayableStatusWorkflow(db, fromStatusId);
  const { rows: all } = await db.query<{ id: number; sort_order: number }>(
    `SELECT id, sort_order FROM payable_statuses WHERE active ORDER BY sort_order ASC, id ASC`,
  );

  const anytimeIds = all.filter((s) => s.sort_order === 0 && s.id !== fromStatusId).map((s) => s.id);
  const workflow = all.filter((s) => s.sort_order > 0);
  const orders = [...new Set(workflow.map((s) => s.sort_order))].sort((a, b) => a - b);
  const allowed = new Set<number>(anytimeIds);

  const addGroup = (order: number | undefined) => {
    if (order == null) return;
    for (const s of workflow) {
      if (s.sort_order === order && s.id !== fromStatusId) allowed.add(s.id);
    }
  };

  if (from.sort_order === 0) {
    addGroup(orders[0]);
    return [...allowed];
  }

  const idx = orders.indexOf(from.sort_order);
  addGroup(from.sort_order);
  if (idx >= 0) {
    addGroup(orders[idx - 1]);
    addGroup(orders[idx + 1]);
  }

  return [...allowed];
}

/**
 * AP workflow: adjacent sort_order groups, same-order siblings, or anytime (sort_order 0).
 * Same status is a no-op allowed by the caller before invoking this.
 */
export async function assertPayableStatusTransition(
  db: Queryable,
  fromStatusId: number,
  toStatusId: number,
) {
  if (fromStatusId === toStatusId) return;
  const allowed = await listAllowedNextPayableStatusIds(db, fromStatusId);
  if (!allowed.includes(toStatusId)) {
    throw new HttpError(
      400,
      'Status must move to an adjacent step, a same-order option, or an anytime (sort order 0) status',
    );
  }
}

/** Destination status gates: required file and/or custom fields. */
export async function assertPayableStatusDestinationGates(
  db: Queryable,
  payableId: number,
  toStatus: PayableStatusWorkflowRow,
  values: Record<number, string>,
) {
  if (toStatus.require_file) {
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM attachments WHERE payable_id = $1`,
      [payableId],
    );
    if ((rows[0]?.n ?? 0) < 1) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { file: ['Upload at least one file before setting this status'] },
      });
    }
  }

  const fieldIds = new Set(toStatus.custom_fields.map((f) => f.id));
  for (const id of Object.keys(values).map(Number)) {
    if (!fieldIds.has(id)) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { custom_field_values: ['Unknown custom field for this status'] },
      });
    }
  }

  for (const field of toStatus.custom_fields) {
    const value = values[field.id]?.trim() || '';
    if (!value) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { custom_field_values: [`${field.label} is required`] },
      });
    }
    if (field.field_type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { custom_field_values: [`${field.label} must be a date`] },
      });
    }
  }
}

export async function upsertPayableStatusFieldValues(
  db: Queryable,
  payableId: number,
  values: Record<number, string>,
) {
  for (const [fieldId, value] of Object.entries(values)) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    await db.query(
      `INSERT INTO payable_status_field_values (payable_id, custom_field_id, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (payable_id, custom_field_id)
       DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [payableId, Number(fieldId), trimmed],
    );
  }
}

/** Staff may change status only when the payable is assigned to them. */
export function assertCanChangeAssignedStatus(
  user: AuthUser,
  assignedTo: number | null,
  noun = 'Payable',
) {
  if (isAdmin(user)) return;
  if (assignedTo == null) {
    throw new HttpError(403, `${noun} is not assigned to you; status cannot be updated`);
  }
  if (assignedTo !== user.id) {
    throw new HttpError(403, `${noun} is not assigned to you; status cannot be updated`);
  }
}

/** Admin or the current assignee may hand the payable off to someone else. */
export function canReassignPayable(user: AuthUser, assignedTo: number | null): boolean {
  if (isAdmin(user)) return true;
  return assignedTo != null && assignedTo === user.id;
}

export function assertCanReassignPayable(
  user: AuthUser,
  assignedTo: number | null,
  noun = 'Payable',
) {
  if (canReassignPayable(user, assignedTo)) return;
  throw new HttpError(403, `Only the assignee or an admin can reassign this ${noun.toLowerCase()}`);
}

/**
 * Admins may set any status. Staff need payables_status for AP.
 * Payable targets are constrained by the sequential workflow
 * (`assertPayableStatusTransition`), not a per-status user matrix.
 */
export async function assertCanSetPayableStatus(
  _db: Queryable,
  user: AuthUser,
  statusId: number,
  ledgerKind: 'payable' | 'receivable',
) {
  if (isAdmin(user)) return;
  if (ledgerKind !== 'payable') return;
  if (!user.permissions.payables_status) {
    throw new HttpError(403, 'Permission denied');
  }
  if (user.payable_status_ids.length > 0 && !user.payable_status_ids.includes(statusId)) {
    throw new HttpError(403, 'You are not allowed to set this payable status');
  }
}

/** Statuses this user may change a payable into. */
export async function listAllowedPayableStatusIds(db: Queryable, userId: number): Promise<number[]> {
  const { rows } = await db.query<{ status_id: number }>(
    `SELECT status_id FROM user_payable_status_permissions WHERE user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.status_id);
}

/** Statuses that auto-assign this user when a payable enters them. */
export async function listDefaultPayableStatusIds(db: Queryable, userId: number): Promise<number[]> {
  const { rows } = await db.query<{ status_id: number }>(
    `SELECT status_id FROM user_payable_default_statuses WHERE user_id = $1 ORDER BY status_id`,
    [userId],
  );
  return rows.map((r) => r.status_id);
}

/** Active staff users bound as default assignees when a payable enters this status. */
export async function listDefaultAssigneesForStatus(
  db: Queryable,
  statusId: number,
): Promise<number[]> {
  const { rows } = await db.query<{ id: number }>(
    `SELECT u.id
       FROM user_payable_default_statuses d
       JOIN users u ON u.id = d.user_id
      WHERE d.status_id = $1 AND u.active AND u.role = 'staff'
      ORDER BY u.id`,
    [statusId],
  );
  return rows.map((r) => r.id);
}

/** First active staff default assignee (workflow steps are exclusive; anytime may have many). */
export async function getDefaultAssigneeForStatus(
  db: Queryable,
  statusId: number,
): Promise<number | null> {
  const ids = await listDefaultAssigneesForStatus(db, statusId);
  return ids[0] ?? null;
}

/**
 * When assigned_to is omitted:
 * - one default binder → assign that user
 * - multiple binders → keep current assignee if already bound, else keep fallback
 * - no binders → keep fallback
 * Explicit null or a user id is honored as-is.
 */
export async function resolveAssigneeForPayableStatus(
  db: Queryable,
  statusId: number,
  explicitAssignedTo: number | null | undefined,
  fallbackAssignee: number | null,
): Promise<number | null> {
  if (explicitAssignedTo !== undefined) return explicitAssignedTo;
  const defaults = await listDefaultAssigneesForStatus(db, statusId);
  if (defaults.length === 0) return fallbackAssignee;
  if (fallbackAssignee != null && defaults.includes(fallbackAssignee)) return fallbackAssignee;
  if (defaults.length === 1) return defaults[0]!;
  return fallbackAssignee;
}

/**
 * Assignee when moving into a status:
 * - sort_order 0 (anytime): client must pick `requestedAssignedTo` (preferably a bound user)
 * - sort_order > 0: ignore client; exclusive status→user binding (1:1)
 */
export async function resolvePayableAssigneeOnStatusMove(
  db: Queryable,
  toStatus: { id: number; name: string; sort_order: number },
  requestedAssignedTo: number | null | undefined,
  fallbackAssignee: number | null,
): Promise<number | null> {
  if (toStatus.sort_order === 0) {
    if (requestedAssignedTo == null) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: {
          assigned_to: [`Choose who to assign when moving to “${toStatus.name}”.`],
        },
      });
    }
    const defaults = await listDefaultAssigneesForStatus(db, toStatus.id);
    if (defaults.length > 0 && !defaults.includes(requestedAssignedTo)) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: {
          assigned_to: [
            `Assignee must be a user bound to “${toStatus.name}” in Users → Permissions.`,
          ],
        },
      });
    }
    const { rows } = await db.query<{ id: number }>(
      `SELECT id FROM users WHERE id = $1 AND active AND role = 'staff'`,
      [requestedAssignedTo],
    );
    if (!rows[0]) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { assigned_to: ['Unknown or inactive staff user'] },
      });
    }
    return rows[0].id;
  }

  return resolveAssigneeForPayableStatus(db, toStatus.id, undefined, fallbackAssignee);
}

export async function replacePayableDefaultStatuses(
  db: Queryable,
  userId: number,
  statusIds: number[],
) {
  const unique = [...new Set(statusIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length > 0) {
    const { rows: valid } = await db.query<{ id: number }>(
      `SELECT id FROM payable_statuses WHERE active AND id = ANY($1::int[])`,
      [unique],
    );
    if (valid.length !== unique.length) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { payable_default_status_ids: ['One or more statuses are unknown or inactive'] },
      });
    }

    // Exclusive only for workflow steps (sort_order > 0). Anytime (0) may be multi-bound.
    const { rows: taken } = await db.query<{ status_name: string; display_name: string }>(
      `SELECT s.name AS status_name, u.display_name
         FROM user_payable_default_statuses d
         JOIN payable_statuses s ON s.id = d.status_id
         JOIN users u ON u.id = d.user_id
        WHERE d.status_id = ANY($1::int[])
          AND d.user_id <> $2
          AND s.sort_order > 0
        ORDER BY s.sort_order, s.name`,
      [unique, userId],
    );
    if (taken.length > 0) {
      const detail = taken
        .map((row) => `${row.status_name} (assigned to ${row.display_name})`)
        .join('; ');
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: {
          payable_default_status_ids: [
            `Each workflow status (sort order > 0) can be a default for only one user. Already taken: ${detail}`,
          ],
        },
      });
    }
  }

  await db.query(`DELETE FROM user_payable_default_statuses WHERE user_id = $1`, [userId]);
  for (const statusId of unique) {
    await db.query(
      `INSERT INTO user_payable_default_statuses (user_id, status_id) VALUES ($1, $2)
       ON CONFLICT (user_id, status_id) DO NOTHING`,
      [userId, statusId],
    );
  }
}

export async function replacePayableStatusPermissions(
  db: Queryable,
  userId: number,
  statusIds: number[],
) {
  await db.query(`DELETE FROM user_payable_status_permissions WHERE user_id = $1`, [userId]);
  for (const statusId of statusIds) {
    await db.query(
      `INSERT INTO user_payable_status_permissions (user_id, status_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, statusId],
    );
  }
}
