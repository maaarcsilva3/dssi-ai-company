import { randomUUID } from 'node:crypto';
import { pool, withTransaction, type Queryable } from '../db';
import { loadAuthUser, assertCanAccessPayable, isAdmin, type AuthUser } from './auth';
import { countPayableAttachments, savePayableAttachmentFromBuffer } from './aiAttachment';
import { HttpError } from './http';
import { isReserveStatus, PAYABLE_LEDGER } from './ledger';
import { notifyAssignee } from './notifications';
import {
  assertCanChangeAssignedStatus,
  assertCanReassignPayable,
  assertCanSetPayableStatus,
  assertPayableStatusDestinationGates,
  assertPayableStatusTransition,
  getPayableStatusWorkflow,
  listDefaultAssigneesForStatus,
  upsertPayableStatusFieldValues,
  type PayableStatusCustomField,
  resolvePayableAssigneeOnStatusMove,
} from './payableStatusAccess';
import { todayForApp } from '../routes/settings';
import { syncDocumentFunds } from './sourceAccounts';
import {
  clearPendingAiAction,
  getPendingAiAction,
  setPendingAiAction,
  type AiPendingAction,
  type AiPendingKind,
} from './aiPendingActions';

type StatusRow = { id: number; name: string; category: string };

export interface AiProposedActionRaw {
  kind?: unknown;
  payableId?: unknown;
  invoiceNo?: unknown;
  statusId?: unknown;
  statusName?: unknown;
  assigneeId?: unknown;
  assigneeName?: unknown;
  remarks?: unknown;
  paymentReference?: unknown;
  paidAt?: unknown;
  checkDate?: unknown;
  sourceAccountId?: unknown;
  /** custom_field_id → value (string keys ok from JSON) */
  customFieldValues?: unknown;
}

/** Missing info for a mutation — ask the admin (do not surface as a hard failure). */
export class AiActionClarifyError extends Error {
  constructor(public readonly question: string) {
    super(question);
    this.name = 'AiActionClarifyError';
  }
}

type SourceAccountOption = { id: number; bank_name: string; account_number: string };

async function listActiveSourceAccounts(): Promise<SourceAccountOption[]> {
  const { rows } = await pool.query<SourceAccountOption>(
    `SELECT id, bank_name, account_number
       FROM source_accounts
      WHERE active
      ORDER BY bank_name, account_number, id`,
  );
  return rows;
}

function formatSourceAccountChoices(accounts: SourceAccountOption[]): string {
  if (!accounts.length) {
    return 'There are no active source accounts yet. Add one under Source Accounts in the web app, then tell me which to use.';
  }
  const lines = accounts.map((a) => `- **${a.id}** — ${a.bank_name} · ${a.account_number}`);
  return [
    'Which **source account** should I use for Create Check for Deposit?',
    '',
    ...lines,
    '',
    'Reply with the account number from the list (e.g. `1`) or the bank name.',
  ].join('\n');
}

/** Resolve sourceAccountId from recent chat (“1”, “account 2”, bank name). */
export function resolveSourceAccountIdFromText(
  texts: string[],
  accounts: SourceAccountOption[],
): number | null {
  if (!accounts.length) return null;
  const joined = texts.join('\n');

  const explicit = joined.match(
    /\b(?:source\s*account|account|bank\s*account|use(?:\s+account)?|id|#)\s*[:=]?\s*(\d+)\b/i,
  );
  if (explicit) {
    const id = Number(explicit[1]);
    if (accounts.some((a) => a.id === id)) return id;
  }

  // Bare number as the latest short reply (e.g. user answered "2").
  const last = [...texts].reverse().find((t) => t.trim().length > 0) ?? '';
  if (/^\d{1,6}$/.test(last.trim())) {
    const id = Number(last.trim());
    if (accounts.some((a) => a.id === id)) return id;
  }

  const lower = joined.toLowerCase();
  const byBank = accounts.filter((a) => lower.includes(a.bank_name.toLowerCase()));
  if (byBank.length === 1) return byBank[0]!.id;

  const byAcct = accounts.filter((a) => lower.includes(a.account_number.toLowerCase()));
  if (byAcct.length === 1) return byAcct[0]!.id;

  return null;
}

export async function enrichSourceAccountFromText(
  raw: AiProposedActionRaw,
  texts: string[],
): Promise<AiProposedActionRaw> {
  if (asPositiveInt(raw.sourceAccountId) != null) return raw;
  const accounts = await listActiveSourceAccounts();
  const id = resolveSourceAccountIdFromText(texts, accounts);
  if (id == null) return raw;
  return { ...raw, sourceAccountId: id };
}

function asTrimmedString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t || null;
}

function asPositiveInt(v: unknown): number | null {
  if (typeof v === 'number') return Number.isInteger(v) && v > 0 ? v : null;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!/^\d+$/.test(t)) return null;
    const n = Number(t);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return null;
}

/**
 * Normalize model output: never treat invoice strings as payableId,
 * and never confuse a list ordinal with payables.id.
 */
export function normalizeProposedActionRaw(raw: AiProposedActionRaw): AiProposedActionRaw {
  const out: AiProposedActionRaw = { ...raw };
  if (typeof out.payableId === 'string') {
    const t = out.payableId.trim();
    if (/^\d+$/.test(t)) {
      out.payableId = Number(t);
    } else if (t) {
      if (!asTrimmedString(out.invoiceNo)) out.invoiceNo = t;
      delete out.payableId;
    }
  }
  return out;
}

type EnrichRow = Record<string, unknown>;

function rowInvoiceNo(row: EnrichRow): string | null {
  return asTrimmedString(row.invoice_no) ?? asTrimmedString(row.invoiceNo);
}

function rowPayableId(row: EnrichRow): number | null {
  return asPositiveInt(row.id) ?? asPositiveInt(row.payable_id) ?? asPositiveInt(row.payableId);
}

/**
 * Fill / correct payableId + invoiceNo from SELECT result rows so the model
 * cannot use a numbered list position (1, 2, 3…) as payables.id.
 */
export function enrichProposedActionFromRows(
  raw: AiProposedActionRaw,
  rowSets: EnrichRow[][],
): AiProposedActionRaw {
  const normalized = normalizeProposedActionRaw(raw);
  const rows = rowSets.flat();
  if (!rows.length) return normalized;

  let payableId = asPositiveInt(normalized.payableId);
  let invoiceNo = asTrimmedString(normalized.invoiceNo);

  if (invoiceNo) {
    const match = rows.find((r) => {
      const inv = rowInvoiceNo(r);
      return inv != null && inv.toLowerCase() === invoiceNo!.toLowerCase();
    });
    const id = match ? rowPayableId(match) : null;
    if (id) return { ...normalized, payableId: id, invoiceNo: rowInvoiceNo(match!) ?? invoiceNo };
  }

  const idsInResults = new Set(
    rows.map(rowPayableId).filter((n): n is number => n != null),
  );

  // payableId present but not in this result set → likely a list ordinal.
  if (payableId != null && idsInResults.size > 0 && !idsInResults.has(payableId)) {
    if (payableId >= 1 && payableId <= rows.length) {
      const row = rows[payableId - 1]!;
      const id = rowPayableId(row);
      const inv = rowInvoiceNo(row);
      if (id) return { ...normalized, payableId: id, invoiceNo: inv ?? invoiceNo ?? undefined };
    }
    // Drop the bad id so findPayable can use invoiceNo if present.
    payableId = null;
  }

  if (payableId == null && !invoiceNo) {
    const payableish = rows.filter((r) => rowPayableId(r) != null);
    if (payableish.length === 1) {
      const row = payableish[0]!;
      return {
        ...normalized,
        payableId: rowPayableId(row)!,
        invoiceNo: rowInvoiceNo(row) ?? undefined,
      };
    }
  }

  return {
    ...normalized,
    ...(payableId != null ? { payableId } : { payableId: undefined }),
    ...(invoiceNo != null ? { invoiceNo } : {}),
  };
}

/** Pull invoice-like tokens (e.g. INV-001) from recent chat when the model omits invoiceNo. */
export function enrichProposedActionFromText(
  raw: AiProposedActionRaw,
  texts: string[],
): AiProposedActionRaw {
  const normalized = normalizeProposedActionRaw(raw);
  if (asTrimmedString(normalized.invoiceNo)) return normalized;

  const found = new Set<string>();
  const re = /\b([A-Za-z]{2,10}-?\d{2,})\b/g;
  for (const text of texts) {
    for (const m of text.matchAll(re)) found.add(m[1]!.toUpperCase());
  }
  if (found.size === 1) {
    // Keep any payableId; findPayable falls back to invoiceNo if the id is wrong.
    return { ...normalized, invoiceNo: [...found][0]! };
  }
  return normalized;
}

async function assertReferenceIfRequired(db: Queryable, methodId: number, reference?: string | null) {
  const { rows } = await db.query<{ requires_reference: boolean }>(
    `SELECT requires_reference FROM payment_methods WHERE id = $1`,
    [methodId],
  );
  if (rows[0]?.requires_reference && !reference?.trim()) {
    throw new HttpError(400, 'Validation failed', {
      fieldErrors: { payment_reference: ['Payment reference is required for this method'] },
    });
  }
}

async function paidAtFor(
  db: Queryable,
  status: StatusRow,
  methodId: number,
  reference: string | null | undefined,
  paidAt: string | null | undefined,
): Promise<string | null> {
  if (status.category !== 'paid') return null;
  await assertReferenceIfRequired(db, methodId, reference);
  return paidAt ?? (await todayForApp(db));
}

type PayableLookup = {
  id: number;
  invoice_no: string | null;
  status_id: number;
  status_name: string;
  assigned_to: number | null;
  created_by: number | null;
  assigned_to_name: string | null;
  payment_method_id: number;
  payment_reference: string | null;
  paid_at: string | null;
  source_account_id: number | null;
};

const PAYABLE_LOOKUP_SELECT = `
  SELECT p.id, p.invoice_no, p.status_id, s.name AS status_name, p.assigned_to, p.created_by,
         u.display_name AS assigned_to_name, p.payment_method_id, p.payment_reference, p.paid_at,
         p.source_account_id
    FROM payables p
    JOIN payable_statuses s ON s.id = p.status_id
    LEFT JOIN users u ON u.id = p.assigned_to`;

async function findPayableByInvoiceNo(invoiceNo: string): Promise<PayableLookup> {
  const { rows } = await pool.query(
    `${PAYABLE_LOOKUP_SELECT}
      WHERE lower(trim(p.invoice_no)) = lower(trim($1))
      ORDER BY p.id DESC
      LIMIT 5`,
    [invoiceNo],
  );
  if (!rows.length) throw new HttpError(404, `No payable found with invoice_no “${invoiceNo}”`);
  if (rows.length > 1) {
    const ids = rows.map((r) => `#${r.id}`).join(', ');
    throw new HttpError(
      400,
      `Multiple payables match invoice “${invoiceNo}” (${ids}). Specify payableId.`,
    );
  }
  return rows[0] as PayableLookup;
}

async function findPayable(opts: {
  payableId?: number | null;
  invoiceNo?: string | null;
}): Promise<PayableLookup> {
  const invoiceNo = opts.invoiceNo?.trim() || null;

  if (opts.payableId) {
    const { rows } = await pool.query(`${PAYABLE_LOOKUP_SELECT} WHERE p.id = $1`, [opts.payableId]);
    if (rows[0]) return rows[0] as PayableLookup;
    // Id missing — fall back to invoice_no when the model used a list ordinal as payableId.
    if (invoiceNo) return findPayableByInvoiceNo(invoiceNo);
    throw new HttpError(
      404,
      `Payable #${opts.payableId} not found. Use payables.id from SQL (or invoiceNo like INV-001), not a list number.`,
    );
  }

  if (!invoiceNo) {
    throw new HttpError(
      400,
      'Specify payableId (payables.id from the database) or invoiceNo for the change',
    );
  }
  return findPayableByInvoiceNo(invoiceNo);
}

async function defaultSourceAccountId(): Promise<number | null> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM source_accounts WHERE active ORDER BY id LIMIT 2`,
  );
  return rows.length === 1 ? rows[0]!.id : null;
}

async function resolveStatus(db: Queryable, opts: { statusId?: number | null; statusName?: string | null }): Promise<StatusRow> {
  if (opts.statusId) {
    const { rows } = await db.query<StatusRow>(
      `SELECT id, name, category FROM payable_statuses WHERE id = $1 AND active`,
      [opts.statusId],
    );
    if (!rows[0]) throw new HttpError(400, `Unknown status id ${opts.statusId}`);
    return rows[0];
  }
  const name = opts.statusName?.trim();
  if (!name) throw new HttpError(400, 'Specify statusName or statusId');

  const { rows } = await db.query<StatusRow>(
    `SELECT id, name, category FROM payable_statuses
      WHERE active AND lower(trim(name)) = lower(trim($1))
      ORDER BY sort_order, id LIMIT 1`,
    [name],
  );
  if (rows[0]) return rows[0];

  const fuzzy = await db.query<StatusRow>(
    `SELECT id, name, category FROM payable_statuses
      WHERE active AND lower(name) LIKE lower($1)
      ORDER BY sort_order, id LIMIT 5`,
    [`%${name}%`],
  );
  if (fuzzy.rows.length === 1) return fuzzy.rows[0]!;
  if (fuzzy.rows.length > 1) {
    throw new HttpError(
      400,
      `Ambiguous status “${name}”. Matches: ${fuzzy.rows.map((s) => s.name).join(', ')}`,
    );
  }
  throw new HttpError(400, `Unknown status “${name}”. Use an exact name from the live status list.`);
}

async function resolveAssignee(opts: {
  assigneeId?: number | null;
  assigneeName?: string | null;
}): Promise<{ id: number; display_name: string } | null> {
  if (opts.assigneeId === null && opts.assigneeName == null) return null;
  if (opts.assigneeId) {
    const { rows } = await pool.query<{ id: number; display_name: string }>(
      `SELECT id, display_name FROM users WHERE id = $1 AND active AND role IN ('admin', 'staff')`,
      [opts.assigneeId],
    );
    if (!rows[0]) throw new HttpError(400, `Unknown assignee id ${opts.assigneeId}`);
    return rows[0];
  }
  const name = opts.assigneeName?.trim();
  if (!name) return null;
  if (/^(unassigned|none|null)$/i.test(name)) return null;

  const { rows } = await pool.query<{ id: number; display_name: string }>(
    `SELECT id, display_name FROM users
      WHERE active AND role IN ('admin', 'staff')
        AND (
          lower(trim(display_name)) = lower(trim($1))
          OR lower(trim(username)) = lower(trim($1))
        )
      ORDER BY id LIMIT 5`,
    [name],
  );
  if (rows[0] && rows.length === 1) return rows[0];

  const fuzzy = await pool.query<{ id: number; display_name: string }>(
    `SELECT id, display_name FROM users
      WHERE active AND role IN ('admin', 'staff')
        AND (
          lower(display_name) LIKE lower($1)
          OR lower(username) LIKE lower($1)
        )
      ORDER BY display_name, id LIMIT 5`,
    [`%${name}%`],
  );
  if (fuzzy.rows.length === 1) return fuzzy.rows[0]!;
  if (fuzzy.rows.length > 1) {
    throw new HttpError(
      400,
      `Ambiguous assignee “${name}”. Matches: ${fuzzy.rows.map((u) => u.display_name).join(', ')}`,
    );
  }
  throw new HttpError(400, `No active user matching “${name}”`);
}

function parseKind(raw: unknown): AiPendingKind | null {
  if (raw === 'change_status' || raw === 'assign' || raw === 'change_status_and_assign') return raw;
  return null;
}

/** Validate AI-proposed action and store it as pending confirmation. */
export async function prepareAiPayableAction(opts: {
  userId: number;
  chatId: string;
  raw: AiProposedActionRaw;
}): Promise<{ summary: string; pending: AiPendingAction }> {
  const user = await loadAuthUser(opts.userId);
  if (!user) throw new HttpError(401, 'Not authenticated');
  if (!isAdmin(user) && !user.permissions.payables_status && !user.permissions.payables_edit) {
    throw new HttpError(403, 'You do not have permission to change payables via AI');
  }

  const raw = normalizeProposedActionRaw(opts.raw);
  let kind = parseKind(raw.kind);
  if (!kind) throw new HttpError(400, 'Invalid action kind');

  const payable = await findPayable({
    payableId: asPositiveInt(raw.payableId),
    invoiceNo: asTrimmedString(raw.invoiceNo),
  });
  assertCanAccessPayable(user, { assignedTo: payable.assigned_to, createdBy: payable.created_by });

  let status: StatusRow | null = null;
  let assignee: { id: number; display_name: string } | null | undefined;
  let sourceAccountId = asPositiveInt(raw.sourceAccountId);
  const wantsAssign =
    kind === 'assign' ||
    kind === 'change_status_and_assign' ||
    raw.assigneeId !== undefined ||
    asTrimmedString(raw.assigneeName) != null;

  if (kind === 'change_status' || kind === 'change_status_and_assign') {
    status = await resolveStatus(pool, {
      statusId: asPositiveInt(raw.statusId),
      statusName: asTrimmedString(raw.statusName),
    });

    // Already on that status (common when the admin says “ready for check creation”
    // about invoices that are already Create check for deposit) → treat as assign-only.
    if (status.id === payable.status_id) {
      status = null;
      if (wantsAssign) kind = 'assign';
      else {
        throw new HttpError(
          400,
          `Payable is already “${payable.status_name}”. Say who to assign it to, or pick a different status.`,
        );
      }
    } else {
      await assertCanSetPayableStatus(pool, user, status.id, 'payable');
      assertCanChangeAssignedStatus(user, payable.assigned_to);
      await assertPayableStatusTransition(pool, payable.status_id, status.id);

      if (isReserveStatus(status.name, PAYABLE_LEDGER.reserveName) && sourceAccountId == null) {
        sourceAccountId =
          payable.source_account_id != null
            ? payable.source_account_id
            : await defaultSourceAccountId();
      }
    }
  }

  if (kind === 'assign' || kind === 'change_status_and_assign') {
    assertCanReassignPayable(user, payable.assigned_to);
    assignee = await resolveAssignee({
      assigneeId: raw.assigneeId === null ? null : asPositiveInt(raw.assigneeId),
      assigneeName: asTrimmedString(raw.assigneeName),
    });
    if (assignee == null && !isAdmin(user)) {
      throw new HttpError(400, 'Pick a staff assignee (clearing assignee is admin-only)');
    }
  }

  const bits: string[] = [
    `Payable #${payable.id}${payable.invoice_no ? ` (${payable.invoice_no})` : ''}`,
    `current status: ${payable.status_name}`,
  ];
  if (status) bits.push(`new status: ${status.name}`);
  if (kind === 'assign' || kind === 'change_status_and_assign') {
    bits.push(`assignee: ${assignee ? assignee.display_name : 'Unassigned'}`);
  }

  const pending: AiPendingAction = {
    id: randomUUID(),
    userId: opts.userId,
    chatId: opts.chatId,
    kind,
    payableId: payable.id,
    statusId: status?.id,
    assigneeId: kind === 'assign' || kind === 'change_status_and_assign' ? (assignee?.id ?? null) : undefined,
    remarks: asTrimmedString(raw.remarks),
    paymentReference: asTrimmedString(raw.paymentReference),
    paidAt: asTrimmedString(raw.paidAt),
    checkDate: asTrimmedString(raw.checkDate),
    sourceAccountId,
    customFieldValues: parseCustomFieldValues(raw.customFieldValues),
    awaiting: null,
    nextCustomFieldId: null,
    summary: bits.join(' · '),
    createdAt: Date.now(),
  };

  return finalizePendingOrAsk(pending);
}

function parseCustomFieldValues(raw: unknown): Record<number, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<number, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const id = Number(k);
    if (!Number.isInteger(id) || id <= 0) continue;
    const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();
    if (s) out[id] = s;
  }
  return out;
}

function askCustomField(field: PayableStatusCustomField): string {
  const typeHint = field.field_type === 'date' ? ' (YYYY-MM-DD)' : '';
  return [
    `I need **${field.label}**${typeHint} for this status change.`,
    '',
    `Reply with the value (e.g. \`${field.field_type === 'date' ? '2026-11-17' : 'ABC-123'}\`).`,
  ].join('\n');
}

function askForFile(statusName: string): string {
  return [
    `Status “${statusName}” requires at least one file attachment.`,
    '',
    '**Telegram:** send a photo, PDF, JPEG, PNG, or WEBP now.',
    '**Web Ask AI:** use the Attach file button, then send.',
  ].join('\n');
}

async function finalizePendingOrAsk(
  pending: AiPendingAction,
): Promise<{ summary: string; pending: AiPendingAction }> {
  if (
    (pending.kind === 'change_status' || pending.kind === 'change_status_and_assign') &&
    pending.statusId
  ) {
    const workflow = await getPayableStatusWorkflow(pool, pending.statusId);

    if (
      isReserveStatus(workflow.name, PAYABLE_LEDGER.reserveName) &&
      pending.sourceAccountId == null
    ) {
      pending.awaiting = 'source_account';
      pending.nextCustomFieldId = null;
      pending.summary = `${pending.summary} · waiting for source account`;
      setPendingAiAction(pending);
      throw new AiActionClarifyError(formatSourceAccountChoices(await listActiveSourceAccounts()));
    }

    if (workflow.category === 'cancelled' && !pending.remarks?.trim()) {
      pending.awaiting = 'remarks';
      pending.nextCustomFieldId = null;
      pending.summary = `${pending.summary} · waiting for cancel remarks`;
      setPendingAiAction(pending);
      throw new AiActionClarifyError(
        'To cancel this payable, what **remarks** should I record? Reply with a short reason.',
      );
    }

    if (workflow.sort_order === 0 && pending.assigneeId == null) {
      const boundIds = await listDefaultAssigneesForStatus(pool, workflow.id);
      const { rows: staff } = await pool.query<{ id: number; display_name: string }>(
        boundIds.length
          ? `SELECT id, display_name FROM users WHERE active AND role = 'staff' AND id = ANY($1::int[]) ORDER BY display_name, id`
          : `SELECT id, display_name FROM users WHERE active AND role = 'staff' ORDER BY display_name, id`,
        boundIds.length ? [boundIds] : [],
      );
      pending.awaiting = 'assignee';
      pending.nextCustomFieldId = null;
      pending.summary = `${pending.summary} · waiting for assignee`;
      setPendingAiAction(pending);
      const list = staff.map((u) => `- ${u.display_name} (id=${u.id})`).join('\n') || '- (no staff users)';
      throw new AiActionClarifyError(
        [
          `“${workflow.name}” is an anytime status — who should it be assigned to?`,
          '',
          list,
          '',
          'Reply with the display name or user id.',
        ].join('\n'),
      );
    }

    if (workflow.category === 'paid' && !pending.checkDate) {
      pending.awaiting = 'check_date';
      pending.nextCustomFieldId = null;
      pending.summary = `${pending.summary} · waiting for check date`;
      setPendingAiAction(pending);
      throw new AiActionClarifyError(
        'What **check date** should I use (YYYY-MM-DD)? Reply with the date.',
      );
    }

    const values = { ...(pending.customFieldValues ?? {}) };
    const missing = workflow.custom_fields.filter((f) => !values[f.id]?.trim());
    if (missing.length) {
      const next = missing[0]!;
      pending.awaiting = 'custom_fields';
      pending.nextCustomFieldId = next.id;
      pending.customFieldValues = values;
      pending.summary = `${pending.summary.replace(/ · waiting.+$/, '')} · waiting for “${next.label}”`;
      setPendingAiAction(pending);
      throw new AiActionClarifyError(askCustomField(next));
    }
    pending.customFieldValues = values;

    if (workflow.require_file) {
      const n = await countPayableAttachments(pending.payableId);
      if (n < 1) {
        pending.awaiting = 'file';
        pending.nextCustomFieldId = null;
        pending.summary = `${pending.summary.replace(/ · waiting.+$/, '')} · waiting for file`;
        setPendingAiAction(pending);
        throw new AiActionClarifyError(askForFile(workflow.name));
      }
    }

    // Validate collected values before confirm.
    await assertPayableStatusDestinationGates(pool, pending.payableId, workflow, values);
  }

  pending.awaiting = null;
  pending.nextCustomFieldId = null;
  pending.summary = pending.summary.replace(/ · waiting.+$/, '');
  pending.createdAt = Date.now();
  setPendingAiAction(pending);
  return { summary: pending.summary, pending };
}

/** Continue an incomplete AI mutation after the admin replies with text. */
export async function continuePendingAiAction(opts: {
  userId: number;
  chatId: string;
  text: string;
}): Promise<{ summary: string; pending: AiPendingAction } | { clarify: string; pending: AiPendingAction }> {
  const pending = getPendingAiAction(opts.userId, opts.chatId);
  if (!pending?.awaiting) {
    throw new HttpError(400, 'No pending change is waiting for more information');
  }

  const reply = opts.text.trim();
  if (!reply) throw new AiActionClarifyError('Please send a value (or a file if one is required).');

  if (pending.awaiting === 'source_account') {
    const accounts = await listActiveSourceAccounts();
    const id = resolveSourceAccountIdFromText([reply], accounts);
    if (id == null) {
      throw new AiActionClarifyError(formatSourceAccountChoices(accounts));
    }
    pending.sourceAccountId = id;
  } else if (pending.awaiting === 'remarks') {
    pending.remarks = reply;
  } else if (pending.awaiting === 'assignee') {
    const asId = Number(reply);
    const resolved = await resolveAssignee({
      assigneeId: Number.isFinite(asId) && asId > 0 ? asId : undefined,
      assigneeName: Number.isFinite(asId) && asId > 0 ? undefined : reply,
    });
    if (resolved == null) {
      throw new AiActionClarifyError('Could not match that staff user. Reply with a display name or user id.');
    }
    pending.assigneeId = resolved.id;
  } else if (pending.awaiting === 'check_date') {
    const m = reply.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (!m) {
      throw new AiActionClarifyError('Please send the check date as YYYY-MM-DD (e.g. 2026-11-17).');
    }
    pending.checkDate = m[1]!;
  } else if (pending.awaiting === 'custom_fields') {
    const fieldId = pending.nextCustomFieldId;
    if (!fieldId || !pending.statusId) {
      throw new HttpError(400, 'Pending custom field is missing');
    }
    const workflow = await getPayableStatusWorkflow(pool, pending.statusId);
    const field = workflow.custom_fields.find((f) => f.id === fieldId);
    if (!field) throw new HttpError(400, 'Custom field not found for this status');

    let value = reply;
    const labeled = reply.match(new RegExp(`^${escapeRegExp(field.label)}\\s*[:=-]\\s*(.+)$`, 'i'));
    if (labeled) value = labeled[1]!.trim();
    if (field.field_type === 'date') {
      const m = value.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (!m) {
        throw new AiActionClarifyError(askCustomField(field));
      }
      value = m[1]!;
    }
    if (!value.trim()) throw new AiActionClarifyError(askCustomField(field));
    pending.customFieldValues = { ...(pending.customFieldValues ?? {}), [fieldId]: value.trim() };
  } else if (pending.awaiting === 'file') {
    throw new AiActionClarifyError(askForFile('this status'));
  }

  pending.awaiting = null;
  pending.nextCustomFieldId = null;
  pending.createdAt = Date.now();
  try {
    return await finalizePendingOrAsk(pending);
  } catch (err) {
    if (err instanceof AiActionClarifyError) {
      const again = getPendingAiAction(opts.userId, opts.chatId);
      return { clarify: err.question, pending: again ?? pending };
    }
    throw err;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Attach a file to the payable for a pending AI status change that requires one. */
export async function attachFileToPendingAiAction(opts: {
  userId: number;
  chatId: string;
  buffer: Buffer;
  originalName: string;
  mimeHint?: string | null;
}): Promise<{ summary: string; pending: AiPendingAction } | { clarify: string; pending: AiPendingAction }> {
  const pending = getPendingAiAction(opts.userId, opts.chatId);
  if (!pending) {
    throw new HttpError(400, 'No pending change is waiting for a file. Start the status change first.');
  }
  if (pending.awaiting && pending.awaiting !== 'file') {
    throw new HttpError(400, 'This pending change is not waiting for a file right now.');
  }
  if (
    pending.kind !== 'change_status' &&
    pending.kind !== 'change_status_and_assign'
  ) {
    throw new HttpError(400, 'Only status changes can receive file attachments here.');
  }

  const saved = await savePayableAttachmentFromBuffer({
    payableId: pending.payableId,
    buffer: opts.buffer,
    originalName: opts.originalName,
    mimeHint: opts.mimeHint,
  });

  pending.awaiting = null;
  pending.nextCustomFieldId = null;
  pending.createdAt = Date.now();
  pending.summary = `${pending.summary.replace(/ · waiting.+$/, '')} · file ${saved.original_name}`;

  try {
    return await finalizePendingOrAsk(pending);
  } catch (err) {
    if (err instanceof AiActionClarifyError) {
      const again = getPendingAiAction(opts.userId, opts.chatId);
      return {
        clarify: `Saved **${saved.original_name}**.\n\n${err.question}`,
        pending: again ?? pending,
      };
    }
    throw err;
  }
}

export function pendingNeedsFile(pending: AiPendingAction | null | undefined): boolean {
  return pending?.awaiting === 'file';
}

export function describePendingAwaiting(pending: AiPendingAction): string | null {
  if (!pending.awaiting) return null;
  return pending.awaiting;
}

export async function executePendingAiAction(pending: AiPendingAction): Promise<string> {
  const user = await loadAuthUser(pending.userId);
  if (!user) throw new HttpError(401, 'Not authenticated');

  const result = await withTransaction(async (db) => {
    const { rows } = await db.query<{
      payment_method_id: number;
      payment_reference: string | null;
      paid_at: string | null;
      status_id: number;
      assigned_to: number | null;
      created_by: number | null;
      invoice_no: string | null;
    }>(
      `SELECT payment_method_id, payment_reference, paid_at, status_id, assigned_to, created_by, invoice_no
         FROM payables WHERE id = $1 FOR UPDATE`,
      [pending.payableId],
    );
    if (!rows[0]) throw new HttpError(404, 'Payable not found');
    const row = rows[0];
    assertCanAccessPayable(user, { assignedTo: row.assigned_to, createdBy: row.created_by });

    const fromStatus = await resolveStatus(db, { statusId: row.status_id });
    let toStatus = fromStatus;
    const messages: string[] = [];

    if (
      (pending.kind === 'change_status' || pending.kind === 'change_status_and_assign') &&
      pending.statusId
    ) {
      toStatus = await resolveStatus(db, { statusId: pending.statusId });
      assertCanChangeAssignedStatus(user, row.assigned_to);
      await assertCanSetPayableStatus(db, user, toStatus.id, 'payable');
      await assertPayableStatusTransition(db, row.status_id, toStatus.id);
      const workflow = await getPayableStatusWorkflow(db, toStatus.id);
      const customValues = pending.customFieldValues ?? {};
      await assertPayableStatusDestinationGates(db, pending.payableId, workflow, customValues);

      if (isReserveStatus(toStatus.name, PAYABLE_LEDGER.reserveName) && pending.sourceAccountId == null) {
        throw new HttpError(400, 'sourceAccountId is required for this status');
      }
      if (toStatus.category === 'cancelled' && !pending.remarks?.trim()) {
        throw new HttpError(400, 'Remarks are required when cancelling');
      }
      if (toStatus.category === 'paid' && !pending.checkDate) {
        throw new HttpError(400, 'Check date is required when marking paid/deposited');
      }

      const reference = pending.paymentReference ?? row.payment_reference;
      const paidAt = await paidAtFor(
        db,
        toStatus,
        row.payment_method_id,
        reference,
        pending.paidAt ?? row.paid_at,
      );

      const nextAssignee = await resolvePayableAssigneeOnStatusMove(
        db,
        { id: workflow.id, name: workflow.name, sort_order: workflow.sort_order },
        pending.assigneeId ?? undefined,
        row.assigned_to,
      );

      await db.query(
        `UPDATE payables
            SET status_id = $1, paid_at = $2, payment_reference = $3, check_date = $4,
                assigned_to = $5, updated_at = now()
          WHERE id = $6`,
        [toStatus.id, paidAt, reference, pending.checkDate ?? null, nextAssignee, pending.payableId],
      );

      if (toStatus.id !== row.status_id) {
        if (Object.keys(customValues).length) {
          await upsertPayableStatusFieldValues(db, pending.payableId, customValues);
        }
        const jsonValues: Record<string, string> = {};
        for (const [id, value] of Object.entries(customValues)) {
          jsonValues[String(id)] = value;
        }
        await db.query(
          `INSERT INTO payable_status_history
             (payable_id, from_status_id, to_status_id, remarks, payment_reference, paid_at, changed_by, check_date, custom_field_values)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
          [
            pending.payableId,
            row.status_id,
            toStatus.id,
            pending.remarks?.trim() || null,
            reference,
            paidAt,
            user.id,
            pending.checkDate ?? null,
            JSON.stringify(jsonValues),
          ],
        );
        await syncDocumentFunds(db, PAYABLE_LEDGER, {
          documentId: pending.payableId,
          fromStatusName: fromStatus.name,
          toStatusName: toStatus.name,
          toCategory: toStatus.category as 'open' | 'paid' | 'cancelled',
          sourceAccountId: pending.sourceAccountId,
          userId: user.id,
          today: await todayForApp(db),
        });
        await notifyAssignee({
          assigneeId: nextAssignee,
          actorId: user.id,
          type: 'payable_status_changed',
          title: `Payable status changed to ${toStatus.name}`,
          link: `/payables/${pending.payableId}`,
          db,
        });
        if (nextAssignee !== row.assigned_to) {
          await notifyAssignee({
            assigneeId: nextAssignee,
            actorId: user.id,
            type: 'payable_assigned',
            title: 'Payable assigned to you',
            link: `/payables/${pending.payableId}`,
            db,
          });
        }
      }
      messages.push(`status ${fromStatus.name} → ${toStatus.name}`);
      row.assigned_to = nextAssignee;
    }

    if (pending.kind === 'assign' || pending.kind === 'change_status_and_assign') {
      assertCanReassignPayable(user, row.assigned_to);
      const nextAssignee = pending.assigneeId ?? null;
      if (nextAssignee == null && !isAdmin(user)) {
        throw new HttpError(400, 'Pick a staff assignee (clearing assignee is admin-only)');
      }
      if (nextAssignee != null) {
        const { rows: users } = await db.query(
          `SELECT id FROM users WHERE id = $1 AND active AND role IN ('admin', 'staff')`,
          [nextAssignee],
        );
        if (!users[0]) throw new HttpError(400, 'Unknown assignee');
      }
      await db.query(`UPDATE payables SET assigned_to = $1, updated_at = now() WHERE id = $2`, [
        nextAssignee,
        pending.payableId,
      ]);
      if (nextAssignee != null) {
        await notifyAssignee({
          assigneeId: nextAssignee,
          actorId: user.id,
          type: 'payable_assigned',
          title: `Payable #${pending.payableId} assigned to you`,
          link: `/payables/${pending.payableId}`,
          db,
        });
      }
      messages.push(nextAssignee == null ? 'cleared assignee' : `assigned to user #${nextAssignee}`);
    }

    return {
      invoiceNo: row.invoice_no,
      messages,
      statusName: toStatus.name,
    };
  });

  clearPendingAiAction(pending.userId, pending.chatId);
  const inv = result.invoiceNo ? ` (${result.invoiceNo})` : '';
  return `Done. Payable #${pending.payableId}${inv}: ${result.messages.join('; ') || 'updated'}. Current status: ${result.statusName}.`;
}

export function confirmationPrompt(summary: string): string {
  return [
    'I can apply this change:',
    '',
    summary,
    '',
    'Reply **confirm** to apply, or **cancel** to abort. (Expires in 10 minutes.)',
  ].join('\n');
}
