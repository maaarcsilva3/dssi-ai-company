import { Router } from 'express';
import { pool, withTransaction, type Queryable } from '../db';
import { HttpError, notFound } from '../lib/http';
import { addDays } from '../lib/releaseWindow';
import { computeTaxAmounts, EWT_RATES, moneyString, roundMoney, type EwtKind } from '../lib/tax';
import {
  idParam,
  payableBatchSchema,
  payableListQuery,
  payableSchema,
  statusPatchSchema,
  type InvoiceLineInput,
  type PayableBatchInput,
  type PayableInput,
  type StatusCategory,
} from '../lib/validation';
import { todayForApp } from './settings';
import { removeStoredFiles } from './attachments';
import {
  assertCanAccessPayable,
  assertCanEditPayable,
  isAdmin,
  requirePermission,
  type AuthUser,
} from '../lib/auth';
import { isReserveStatus, PAYABLE_LEDGER, RECEIVABLE_LEDGER, type LedgerSpec } from '../lib/ledger';
import {
  assertCanChangeAssignedStatus,
  assertCanReassignPayable,
  assertCanSetPayableStatus,
  assertPayableStatusDestinationGates,
  assertPayableStatusTransition,
  canReassignPayable,
  getPayableStatusWorkflow,
  normalizeCustomFieldValuesInput,
  resolvePayableAssigneeOnStatusMove,
  upsertPayableStatusFieldValues,
} from '../lib/payableStatusAccess';
import { notifyAssignee } from '../lib/notifications';
import { syncDocumentFunds, undoDocumentFunds } from '../lib/sourceAccounts';
import {
  assertPayablePdcSchedule,
  listPayablePdcLines,
  replacePayablePdcLines,
} from '../lib/payablePdc';


export function documentSelect(spec: LedgerSpec) {
  const statusFieldValues =
    spec.kind === 'payable'
      ? `,
         (SELECT COALESCE(jsonb_object_agg(psfv.custom_field_id::text, to_jsonb(psfv.value)), '{}'::jsonb)
            FROM payable_status_field_values psfv
           WHERE psfv.payable_id = p.id) AS status_field_values,
         (SELECT count(*)::int FROM payable_pdc_lines pl WHERE pl.payable_id = p.id) AS pdc_count`
      : '';
  return `
  SELECT p.*,
         c.name  AS client_name,
         t.name  AS payment_type_name,
         m.name  AS payment_method_name,
         m.requires_reference,
         pt.name AS payment_term_name,
         s.name  AS status_name,
         s.category AS status_category,
         s.color AS status_color,
         u.display_name AS assigned_to_name,
         sa.bank_name AS source_account_bank_name,
         sa.account_number AS source_account_number,
         (SELECT count(*)::int FROM attachments a WHERE a.${spec.parentFk} = p.id) AS attachment_count,
         (SELECT a.id FROM attachments a
           WHERE a.${spec.parentFk} = p.id AND a.mime LIKE 'image/%'
           ORDER BY a.id LIMIT 1) AS thumbnail_id,
         (SELECT count(*)::int FROM ${spec.invoices} pi WHERE pi.${spec.parentFk} = p.id) AS invoice_count
         ${statusFieldValues}
    FROM ${spec.document} p
    JOIN ${spec.party} c          ON c.id = p.client_id
    JOIN payment_types t    ON t.id = p.payment_type_id
    JOIN payment_methods m  ON m.id = p.payment_method_id
    JOIN ${spec.statuses} s ON s.id = p.status_id
    LEFT JOIN payment_terms pt ON pt.id = p.payment_term_id
    LEFT JOIN users u       ON u.id = p.assigned_to
    LEFT JOIN source_accounts sa ON sa.id = p.source_account_id`;
}

export function createDocumentRouter(spec: LedgerSpec) {
const PAYABLE_SELECT = documentSelect(spec);

const SORT_COLUMNS: Record<string, string> = {
  due_date: 'p.due_date',
  amount: 'p.amount',
  client: 'lower(c.name)',
  created_at: 'p.created_at',
  invoice_date: 'p.invoice_date',
  payment_reference: 'lower(p.payment_reference)',
};

async function assertReferenceIfRequired(db: Queryable, methodId: number, reference?: string | null) {
  const { rows } = await db.query('SELECT name, requires_reference FROM payment_methods WHERE id = $1', [methodId]);
  if (!rows[0]) throw new HttpError(400, 'Unknown payment method');
  if (rows[0].requires_reference && !reference) {
    throw new HttpError(400, `A payment reference is required for ${rows[0].name} payments`);
  }
}

interface StatusRow {
  id: number;
  name: string;
  category: StatusCategory;
  sort_order: number;
}

/** The requested status, or the first active "open" status when none is given. */
async function resolveStatus(db: Queryable, statusId?: number | null): Promise<StatusRow> {
  const { rows } = statusId
    ? await db.query<StatusRow>(
        `SELECT id, name, category, sort_order FROM ${spec.statuses} WHERE id = $1`,
        [statusId],
      )
    : await db.query<StatusRow>(
        `SELECT id, name, category, sort_order FROM ${spec.statuses}
          WHERE active AND category = 'open' ORDER BY sort_order, id LIMIT 1`,
      );
  if (!rows[0]) throw new HttpError(400, statusId ? 'Unknown status' : 'No active "open" status is configured');
  return rows[0];
}

async function resolveCreateStatus(
  db: Queryable,
  requestedStatusId: number | null | undefined,
  draft: boolean,
  user: AuthUser,
): Promise<StatusRow> {
  if (spec.kind === 'payable' && !isAdmin(user) && !draft) {
    // Staff submit defaults to "For review" (assignee then follows status→user binding).
    const { rows } = await db.query<StatusRow>(
      `SELECT id, name, category, sort_order FROM ${spec.statuses}
        WHERE active AND lower(name) = 'for review'
        ORDER BY sort_order, id LIMIT 1`,
    );
    return rows[0] ?? resolveStatus(db);
  }
  return resolveStatus(db, requestedStatusId);
}

/**
 * paid_at for a payable moving to `status`: required (defaults to today) for paid statuses, cleared otherwise.
 * Paid statuses also need a reference when the payment format requires one.
 */
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

async function assertRemarksForCancelled(status: StatusRow, remarks?: string | null) {
  if (status.category === 'cancelled' && !remarks?.trim()) {
    throw new HttpError(400, 'Validation failed', { fieldErrors: { remarks: ['Remarks are required when cancelling'] } });
  }
}

async function assertCheckDateForPaid(status: StatusRow, checkDate: string | null | undefined) {
  if (status.category === 'paid' && !checkDate) {
    throw new HttpError(400, 'Validation failed', {
      fieldErrors: { check_date: ['Check date is required when marking deposited/paid'] },
    });
  }
}

async function insertStatusHistory(
  db: Queryable,
  opts: {
    payableId: number;
    fromStatusId: number | null;
    toStatusId: number;
    remarks?: string | null;
    paymentReference?: string | null;
    paidAt?: string | null;
    changedBy?: number | null;
    checkDate?: string | null;
    customFieldValue?: string | null;
    customFieldValues?: Record<number, string>;
  },
) {
  if (spec.kind === 'payable') {
    const valuesMap = opts.customFieldValues ?? {};
    const jsonValues = Object.fromEntries(
      Object.entries(valuesMap).map(([k, v]) => [String(k), v]),
    );
    const legacySingle =
      opts.customFieldValue?.trim() ||
      Object.values(valuesMap).join(' · ') ||
      null;
    await db.query(
      `INSERT INTO ${spec.history}
         (${spec.parentFk}, from_status_id, to_status_id, remarks, payment_reference, paid_at, changed_by, check_date, custom_field_value, custom_field_values)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        opts.payableId,
        opts.fromStatusId,
        opts.toStatusId,
        opts.remarks?.trim() || null,
        opts.paymentReference ?? null,
        opts.paidAt ?? null,
        opts.changedBy ?? null,
        opts.checkDate ?? null,
        legacySingle,
        JSON.stringify(jsonValues),
      ],
    );
    return;
  }
  await db.query(
    `INSERT INTO ${spec.history}
       (${spec.parentFk}, from_status_id, to_status_id, remarks, payment_reference, paid_at, changed_by, check_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      opts.payableId,
      opts.fromStatusId,
      opts.toStatusId,
      opts.remarks?.trim() || null,
      opts.paymentReference ?? null,
      opts.paidAt ?? null,
      opts.changedBy ?? null,
      opts.checkDate ?? null,
    ],
  );
}

interface ExistingTerm {
  client_id: number;
  payment_term_id: number | null;
}

interface TaxFields {
  apply_vat: boolean;
  vat_rate: number;
  vat_amount: string;
  apply_ewt: boolean;
  ewt_kind: EwtKind | null;
  ewt_rate: number | null;
  ewt_amount: string;
  gross_amount: string;
  amount: string;
}

interface ComputedInvoice {
  invoice_no: string | null;
  invoice_date: string | null;
  payment_term_id: number | null;
  due_date: string | null;
  gross_amount: string;
  vat_amount: string;
  ewt_amount: string;
  net_amount: string;
  sort_order: number;
}

function resolveEwtRate(applyEwt: boolean, kind: EwtKind | null | undefined): number | null {
  if (!applyEwt) return null;
  if (!kind) throw new HttpError(400, 'Validation failed', { fieldErrors: { ewt_kind: ['Select products or service for EWT'] } });
  return EWT_RATES[kind];
}

function computeLines(
  lines: InvoiceLineInput[],
  applyVat: boolean,
  vatRate: number,
  applyEwt: boolean,
  ewtKind: EwtKind | null,
): { invoices: ComputedInvoice[]; tax: TaxFields; invoice_no: string | null; invoice_date: string | null } {
  const ewtRate = resolveEwtRate(applyEwt, ewtKind);
  const invoices: ComputedInvoice[] = lines.map((line, i) => {
    const gross = Number(line.gross_amount);
    const { vatAmount, ewtAmount, netAmount } = computeTaxAmounts(gross, {
      applyVat,
      vatRate,
      applyEwt,
      ewtRate: ewtRate ?? 0,
    });
    if (netAmount <= 0) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { invoices: [`Invoice ${i + 1}: net amount must be greater than zero`] },
      });
    }
    return {
      invoice_no: line.invoice_no ?? null,
      invoice_date: line.invoice_date ?? null,
      payment_term_id: line.payment_term_id ?? null,
      due_date: line.due_date ?? null,
      gross_amount: moneyString(gross),
      vat_amount: moneyString(vatAmount),
      ewt_amount: moneyString(ewtAmount),
      net_amount: moneyString(netAmount),
      sort_order: i,
    };
  });

  const grossTotal = invoices.reduce((s, inv) => s + Number(inv.gross_amount), 0);
  const vatTotal = invoices.reduce((s, inv) => s + Number(inv.vat_amount), 0);
  const ewtTotal = invoices.reduce((s, inv) => s + Number(inv.ewt_amount), 0);
  const netTotal = invoices.reduce((s, inv) => s + Number(inv.net_amount), 0);

  const numbered = invoices.map((inv) => inv.invoice_no).filter(Boolean) as string[];
  const invoice_no =
    numbered.length === 0 ? null : numbered.length === 1 ? numbered[0] : `${numbered[0]} +${numbered.length - 1}`;
  const dates = invoices.map((inv) => inv.invoice_date).filter(Boolean) as string[];
  const invoice_date = dates.length ? dates.sort()[0] : null;

  return {
    invoices,
    invoice_no,
    invoice_date,
    tax: {
      apply_vat: applyVat,
      vat_rate: vatRate,
      vat_amount: moneyString(vatTotal),
      apply_ewt: applyEwt,
      ewt_kind: applyEwt ? ewtKind : null,
      ewt_rate: ewtRate,
      ewt_amount: moneyString(ewtTotal),
      gross_amount: moneyString(grossTotal),
      amount: moneyString(netTotal),
    },
  };
}

function computeSingleAmount(input: PayableInput): {
  invoices: ComputedInvoice[];
  tax: TaxFields;
  invoice_no: string | null;
  invoice_date: string | null;
} {
  const applyVat = Boolean(input.apply_vat);
  const applyEwt = Boolean(input.apply_ewt);
  const vatRate = input.vat_rate ?? 12;
  const ewtKind = (input.ewt_kind ?? null) as EwtKind | null;
  const ewtRate = resolveEwtRate(applyEwt, ewtKind);

  const gross = Number(input.gross_amount ?? input.amount);
  if (!Number.isFinite(gross) || gross <= 0) {
    throw new HttpError(400, 'Validation failed', { fieldErrors: { amount: ['Amount must be greater than zero'] } });
  }

  const { vatAmount, ewtAmount, netAmount } = computeTaxAmounts(gross, {
    applyVat,
    vatRate,
    applyEwt,
    ewtRate: ewtRate ?? 0,
  });
  if (netAmount <= 0) {
    throw new HttpError(400, 'Validation failed', { fieldErrors: { amount: ['Net amount must be greater than zero'] } });
  }

  const tax: TaxFields = {
    apply_vat: applyVat,
    vat_rate: vatRate,
    vat_amount: moneyString(vatAmount),
    apply_ewt: applyEwt,
    ewt_kind: applyEwt ? ewtKind : null,
    ewt_rate: ewtRate,
    ewt_amount: moneyString(ewtAmount),
    gross_amount: moneyString(gross),
    amount: moneyString(netAmount),
  };

  const hasInvoiceMeta = Boolean(input.invoice_no || input.invoice_date);
  const invoices: ComputedInvoice[] = hasInvoiceMeta
    ? [
        {
          invoice_no: input.invoice_no ?? null,
          invoice_date: input.invoice_date ?? null,
          payment_term_id: input.payment_term_id ?? null,
          due_date: input.due_date ?? null,
          gross_amount: tax.gross_amount,
          vat_amount: tax.vat_amount,
          ewt_amount: tax.ewt_amount,
          net_amount: tax.amount,
          sort_order: 0,
        },
      ]
    : [];

  return {
    tax,
    invoice_no: input.invoice_no ?? null,
    invoice_date: input.invoice_date ?? null,
    invoices,
  };
}

async function supplierDefaultTermId(db: Queryable, clientId: number): Promise<number | null> {
  const { rows } = await db.query<{ payment_term_id: number | null }>(`SELECT payment_term_id FROM ${spec.party} WHERE id = $1`, [
    clientId,
  ]);
  if (!rows[0]) throw new HttpError(400, spec.unknownParty);
  return rows[0].payment_term_id;
}

async function termDays(db: Queryable, termId: number): Promise<number> {
  const { rows } = await db.query<{ days: number; active: boolean }>('SELECT days, active FROM payment_terms WHERE id = $1', [
    termId,
  ]);
  if (!rows[0]) {
    throw new HttpError(400, 'Validation failed', { fieldErrors: { payment_term_id: ['Unknown payment term'] } });
  }
  return rows[0].days;
}

/**
 * Resolve which term applies: explicit override > keep existing snapshot on edit (same supplier) > supplier default.
 * Passing `payment_term_id: null` explicitly clears the term (manual due date).
 */
async function resolveTermId(
  db: Queryable,
  clientId: number,
  override: number | null | undefined,
  existing?: ExistingTerm,
): Promise<number | null> {
  if (override !== undefined) {
    if (override == null) return null;
    await termDays(db, override);
    return override;
  }
  if (existing && existing.client_id === clientId && existing.payment_term_id) {
    return existing.payment_term_id;
  }
  return supplierDefaultTermId(db, clientId);
}

async function dueDateForTerm(
  db: Queryable,
  termId: number | null,
  invoiceDate: string | null,
  manualDue: string | null | undefined,
  fieldPath: string,
): Promise<string> {
  if (termId) {
    if (!invoiceDate) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { [fieldPath]: ['Invoice date is required to compute the due date'] },
      });
    }
    const days = await termDays(db, termId);
    return addDays(invoiceDate, days);
  }
  if (!manualDue) {
    throw new HttpError(400, 'Validation failed', {
      fieldErrors: { due_date: ['No payment term selected; enter the due date manually'] },
    });
  }
  return manualDue;
}

/**
 * Resolves payment term(s) and due date, and keeps paid fields consistent with the status.
 * Per-invoice `payment_term_id` overrides the supplier default. For multiple lines under one payable,
 * the header uses the earliest computed due date and that line's term.
 */
async function normalize(
  db: Queryable,
  input: PayableInput,
  existing?: ExistingTerm,
): Promise<
  PayableInput &
    TaxFields & {
      payment_term_id: number | null;
      due_date: string;
      status_id: number;
      paid_at: string | null;
      invoice_no: string | null;
      invoice_date: string | null;
      invoices: ComputedInvoice[];
    }
> {
  const money =
    input.invoices?.length
      ? computeLines(input.invoices, Boolean(input.apply_vat), input.vat_rate ?? 12, Boolean(input.apply_ewt), (input.ewt_kind ?? null) as EwtKind | null)
      : computeSingleAmount(input);

  let termId: number | null;
  let dueDate: string;

  if (input.invoices && input.invoices.length > 1) {
    // Per-line terms; payable header takes the earliest due.
    const lineDues: { due: string; termId: number | null }[] = [];
    for (let i = 0; i < input.invoices.length; i++) {
      const line = input.invoices[i];
      const lineTerm = await resolveTermId(
        db,
        input.client_id,
        line.payment_term_id !== undefined ? line.payment_term_id : input.payment_term_id,
        existing,
      );
      const due = await dueDateForTerm(db, lineTerm, line.invoice_date ?? null, line.due_date ?? input.due_date, `invoices.${i}.invoice_date`);
      money.invoices[i].payment_term_id = lineTerm;
      money.invoices[i].due_date = due;
      lineDues.push({ due, termId: lineTerm });
    }
    lineDues.sort((a, b) => a.due.localeCompare(b.due));
    dueDate = lineDues[0].due;
    termId = lineDues[0].termId;
  } else {
    const lineOverride =
      input.invoices?.length === 1 && input.invoices[0].payment_term_id !== undefined
        ? input.invoices[0].payment_term_id
        : input.payment_term_id;
    termId = await resolveTermId(db, input.client_id, lineOverride, existing);
    const invoiceDate = input.invoices?.length === 1 ? input.invoices[0].invoice_date ?? money.invoice_date : money.invoice_date;
    const manualDue =
      input.invoices?.length === 1 ? (input.invoices[0].due_date ?? input.due_date) : input.due_date;
    dueDate = await dueDateForTerm(db, termId, invoiceDate, manualDue, 'invoice_date');
    if (money.invoices[0]) {
      money.invoices[0].payment_term_id = termId;
      money.invoices[0].due_date = dueDate;
    }
  }

  const status = await resolveStatus(db, input.status_id);
  const paidAt = await paidAtFor(db, status, input.payment_method_id, input.payment_reference, input.paid_at);

  return {
    ...input,
    ...money.tax,
    payment_term_id: termId,
    due_date: dueDate,
    status_id: status.id,
    paid_at: paidAt,
    invoice_no: money.invoice_no,
    invoice_date: money.invoice_date,
    invoices: money.invoices,
  };
}

async function normalizeBatchItem(
  db: Queryable,
  input: PayableBatchInput,
  line: InvoiceLineInput,
): Promise<ReturnType<typeof normalize> extends Promise<infer T> ? T : never> {
  return normalize(db, {
    ...input,
    payment_term_id: line.payment_term_id !== undefined ? line.payment_term_id : input.payment_term_id,
    invoices: [line],
    invoice_no: line.invoice_no,
    invoice_date: line.invoice_date,
    due_date: line.due_date ?? input.due_date,
  });
}

const ALL_COLUMNS = [
  'client_id',
  'payment_type_id',
  'payment_method_id',
  'payment_term_id',
  'invoice_no',
  'invoice_date',
  'due_date',
  'amount',
  'gross_amount',
  'apply_vat',
  'vat_rate',
  'vat_amount',
  'apply_ewt',
  'ewt_kind',
  'ewt_rate',
  'ewt_amount',
  'description',
  'status_id',
  'paid_at',
  'payment_reference',
  'assigned_to',
  'is_draft',
  'check_date',
  'created_by',
  'fuel_liters',
  'fuel_price_per_liter',
  'fuel_order_date',
  'fuel_delivery_date',
  'fuel_delivery_receipt',
] as const;
  const WRITE_COLUMNS = spec.fuel ? ALL_COLUMNS : ALL_COLUMNS.filter((c) => !c.startsWith('fuel_'));

async function lookupStaffAssigneeId(requested: number): Promise<number> {
  const { rows } = await pool.query(`SELECT id FROM users WHERE id = $1 AND active AND role = 'staff'`, [requested]);
  if (!rows[0]) {
    throw new HttpError(400, 'Validation failed', {
      fieldErrors: { assigned_to: ['Unknown or inactive staff user'] },
    });
  }
  return rows[0].id as number;
}

/**
 * Resolve assignee for create/update.
 * - drafts: always unassigned
 * - admin: may set any staff (or null)
 * - current assignee: may reassign to another staff (null keeps current)
 * - other staff: forced to self (create / submit draft)
 */
async function resolveAssignedTo(
  user: AuthUser,
  requested: number | null | undefined,
  opts?: { isDraft?: boolean; currentAssignedTo?: number | null },
): Promise<number | null> {
  if (opts?.isDraft) return null;

  const mayChoose = canReassignPayable(user, opts?.currentAssignedTo ?? null);
  if (!mayChoose) {
    // Create / submit without chooser rights → self; otherwise keep current assignee.
    return opts?.currentAssignedTo ?? user.id;
  }

  if (requested == null) {
    if (isAdmin(user)) return null;
    return opts?.currentAssignedTo ?? user.id;
  }
  return lookupStaffAssigneeId(requested);
}

async function loadPayableAccess(payableId: number) {
  const { rows } = await pool.query<{
    assigned_to: number | null;
    created_by: number | null;
    is_draft: boolean;
  }>(`SELECT assigned_to, created_by, COALESCE(is_draft, false) AS is_draft FROM ${spec.document} WHERE id = $1`, [
    payableId,
  ]);
  if (!rows[0]) throw notFound(spec.noun);
  return {
    assignedTo: rows[0].assigned_to,
    createdBy: rows[0].created_by,
    isDraft: rows[0].is_draft,
  };
}

async function assertPayableAccess(user: AuthUser, payableId: number) {
  assertCanAccessPayable(user, await loadPayableAccess(payableId), spec.noun);
}

async function assertPayableEditAccess(user: AuthUser, payableId: number) {
  assertCanEditPayable(user, await loadPayableAccess(payableId), spec.noun);
}

function writeValues(data: Record<string, unknown>) {
  return WRITE_COLUMNS.map((c) => data[c] ?? null);
}

const CLEARED_FUEL = {
  fuel_liters: null,
  fuel_price_per_liter: null,
  fuel_order_date: null,
  fuel_delivery_date: null,
  fuel_delivery_receipt: null,
} as const;

/** Fuel gross is liters × price. Other payment types drop the fuel columns. */
async function applyFuelAmounts<T extends PayableInput | PayableBatchInput>(db: Queryable, input: T): Promise<T> {
  if (!spec.fuel) return input;
  const { rows } = await db.query<{ name: string }>('SELECT name FROM payment_types WHERE id = $1', [input.payment_type_id]);
  if (!rows[0]) throw new HttpError(400, 'Unknown payment type');
  if (rows[0].name.trim().toLowerCase() !== 'fuel') {
    return { ...input, ...CLEARED_FUEL };
  }

  const missing: Record<string, string[]> = {};
  if (!input.fuel_liters) missing.fuel_liters = ['Enter liters'];
  if (!input.fuel_price_per_liter) missing.fuel_price_per_liter = ['Enter the price per liter'];
  if (!input.fuel_order_date) missing.fuel_order_date = ['Enter the order date'];
  if (!input.fuel_delivery_date) missing.fuel_delivery_date = ['Enter the delivery date'];
  if (!input.fuel_delivery_receipt?.trim()) missing.fuel_delivery_receipt = ['Enter the delivery receipt number'];
  if (Object.keys(missing).length) {
    throw new HttpError(400, 'Validation failed', { fieldErrors: missing });
  }

  const total = moneyString(roundMoney(Number(input.fuel_liters) * Number(input.fuel_price_per_liter)));
  const invoices = input.invoices?.length
    ? input.invoices.map((line, i) => (i === 0 ? { ...line, gross_amount: total } : line))
    : input.invoices;
  if (invoices?.length) return { ...input, invoices };
  return { ...input, gross_amount: total } as T;
}

async function replaceInvoices(db: Queryable, payableId: number, invoices: ComputedInvoice[]) {
  await db.query(`DELETE FROM ${spec.invoices} WHERE ${spec.parentFk} = $1`, [payableId]);
  for (const inv of invoices) {
    await db.query(
      `INSERT INTO ${spec.invoices}
         (${spec.parentFk}, invoice_no, invoice_date, payment_term_id, due_date, gross_amount, vat_amount, ewt_amount, net_amount, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        payableId,
        inv.invoice_no,
        inv.invoice_date,
        inv.payment_term_id,
        inv.due_date,
        inv.gross_amount,
        inv.vat_amount,
        inv.ewt_amount,
        inv.net_amount,
        inv.sort_order,
      ],
    );
  }
}

async function fetchInvoices(db: Queryable, payableId: number) {
  const { rows } = await db.query(
    `SELECT id, invoice_no, invoice_date, gross_amount::text, vat_amount::text, ewt_amount::text,
            net_amount::text, payment_term_id, due_date, sort_order
       FROM ${spec.invoices} WHERE ${spec.parentFk} = $1 ORDER BY sort_order, id`,
    [payableId],
  );
  return rows;
}

async function fetchPayable(db: Queryable, id: number) {
  const { rows } = await db.query(`${PAYABLE_SELECT} WHERE p.id = $1`, [id]);
  if (!rows[0]) throw notFound(spec.noun);
  const [attachments, invoices, pdcLines] = await Promise.all([
    db.query(`SELECT id, original_name, mime, size, created_at FROM attachments WHERE ${spec.parentFk} = $1 ORDER BY id`, [id]),
    fetchInvoices(db, id),
    spec.kind === 'payable' ? listPayablePdcLines(db, id) : Promise.resolve([]),
  ]);
  return {
    ...rows[0],
    attachments: attachments.rows,
    invoices,
    pdc_lines: spec.kind === 'payable' ? pdcLines : undefined,
  };
}

async function fetchStatusHistory(db: Queryable, payableId: number) {
  const { rows } = await db.query(
    `SELECT h.id, h.${spec.parentFk}, h.from_status_id, h.to_status_id, h.remarks, h.payment_reference, h.paid_at,
            h.check_date, h.changed_by, u.display_name AS changed_by_name, h.created_at,
            fs.name AS from_status_name, fs.color AS from_status_color, fs.category AS from_status_category,
            ts.name AS to_status_name, ts.color AS to_status_color, ts.category AS to_status_category
       FROM ${spec.history} h
       LEFT JOIN users u ON u.id = h.changed_by
       LEFT JOIN ${spec.statuses} fs ON fs.id = h.from_status_id
       JOIN ${spec.statuses} ts ON ts.id = h.to_status_id
      WHERE h.${spec.parentFk} = $1
      ORDER BY h.created_at DESC, h.id DESC`,
    [payableId],
  );
  return rows;
}

const router = Router();

router.get('/', requirePermission(`${spec.document}_view`), async (req, res) => {
  const q = payableListQuery.parse(req.query);
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (!isAdmin(req.user!)) {
    params.push(req.user!.id);
    const n = `$${params.length}`;
    where.push(`(p.assigned_to = ${n} OR p.created_by = ${n})`);
  }
  if (q.draftsOnly) where.push('p.is_draft = true');
  else if (!q.includeDrafts) where.push('p.is_draft = false');
  if (q.category?.length) add('s.category = ANY(?::text[])', q.category);
  if (q.statusId) add('p.status_id = ?', q.statusId);
  if (q.clientId) add('p.client_id = ?', q.clientId);
  if (q.typeId) add('p.payment_type_id = ?', q.typeId);
  if (q.methodId) add('p.payment_method_id = ?', q.methodId);
  if (q.dueFrom) add('p.due_date >= ?', q.dueFrom);
  if (q.dueTo) add('p.due_date <= ?', q.dueTo);
  if (q.reference) {
    params.push(`%${q.reference}%`);
    where.push(`p.payment_reference ILIKE $${params.length}`);
  }
  if (q.search) {
    params.push(`%${q.search}%`);
    const n = `$${params.length}`;
    where.push(
      `(p.invoice_no ILIKE ${n} OR p.description ILIKE ${n} OR c.name ILIKE ${n} OR p.payment_reference ILIKE ${n}
        OR EXISTS (SELECT 1 FROM ${spec.invoices} pi WHERE pi.${spec.parentFk} = p.id AND pi.invoice_no ILIKE ${n}))`,
    );
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = `${SORT_COLUMNS[q.sort]} ${q.dir.toUpperCase()} NULLS LAST, p.id ${q.dir.toUpperCase()}`;

  const [items, summary] = await Promise.all([
    pool.query(`${PAYABLE_SELECT} ${whereSql} ORDER BY ${order} LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`, params),
    pool.query(
      `SELECT count(*)::int AS total, COALESCE(sum(p.amount), 0)::text AS total_amount
         FROM ${spec.document} p
         JOIN ${spec.party} c ON c.id = p.client_id
         JOIN ${spec.statuses} s ON s.id = p.status_id
         ${whereSql}`,
      params,
    ),
  ]);

  res.json({
    items: items.rows,
    total: summary.rows[0].total,
    totalAmount: summary.rows[0].total_amount,
    page: q.page,
    pageSize: q.pageSize,
  });
});

router.get(
  '/:id/status-history',
  // Admins always; staff need payables_status_history (receivables: view is enough).
  (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    return requirePermission(
      spec.kind === 'payable' ? 'payables_status_history' : `${spec.document}_view`,
    )(req, res, next);
  },
  async (req, res) => {
    const { id } = idParam.parse(req.params);
    await assertPayableAccess(req.user!, id);
    res.json(await fetchStatusHistory(pool, id));
  },
);

router.get('/:id', requirePermission(`${spec.document}_view`), async (req, res) => {
  const { id } = idParam.parse(req.params);
  await assertPayableAccess(req.user!, id);
  res.json(await fetchPayable(pool, id));
});

router.post('/batch', requirePermission(`${spec.document}_create`), async (req, res) => {
  const input = payableBatchSchema.parse(req.body);
  const result = await withTransaction(async (db) => {
    const created = [];
    const today = await todayForApp(db);
    for (const line of input.invoices) {
      const createStatus = await resolveCreateStatus(db, input.status_id, input.is_draft, req.user!);
      const fueled = await applyFuelAmounts(db, { ...input, status_id: createStatus.id, invoices: [line] });
      const data = await normalizeBatchItem(db, fueled, fueled.invoices![0]);
      const status = await resolveStatus(db, data.status_id);
      const fallbackAssignee = await resolveAssignedTo(req.user!, input.assigned_to, {
        isDraft: input.is_draft,
      });
      // Payables: anytime (sort 0) requires pick; workflow steps use exclusive binding.
      const assignedTo =
        spec.kind === 'payable' && !input.is_draft
          ? await resolvePayableAssigneeOnStatusMove(db, status, input.assigned_to, fallbackAssignee)
          : fallbackAssignee;
      if (spec.kind === 'payable' && !input.is_draft) {
        await assertCheckDateForPaid(status, input.check_date);
      }
      if (isReserveStatus(status.name, spec.reserveName) && !input.source_account_id) {
        throw new HttpError(400, 'Validation failed', {
          fieldErrors: { source_account_id: [spec.reserveError] },
        });
      }
      const row = {
        ...data,
        assigned_to: assignedTo,
        is_draft: input.is_draft,
        check_date: input.check_date,
        created_by: req.user!.id,
      };
      const values = writeValues(row as unknown as Record<string, unknown>);
      const placeholders = WRITE_COLUMNS.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await db.query(
        `INSERT INTO ${spec.document} (${WRITE_COLUMNS.join(', ')}) VALUES (${placeholders}) RETURNING id`,
        values,
      );
      const payableId = rows[0].id as number;
      await replaceInvoices(db, payableId, data.invoices);
      await insertStatusHistory(db, {
        payableId,
        fromStatusId: null,
        toStatusId: data.status_id,
        paymentReference: data.payment_reference,
        paidAt: data.paid_at,
        changedBy: req.user!.id,
        checkDate: input.check_date,
      });
      await syncDocumentFunds(db, spec, {
        documentId: payableId,
        fromStatusName: null,
        toStatusName: status.name,
        toCategory: status.category,
        sourceAccountId: input.source_account_id,
        userId: req.user!.id,
        today,
      });
      if (spec.kind === 'payable') {
        await notifyAssignee({
          assigneeId: assignedTo,
          actorId: req.user!.id,
          type: 'payable_assigned',
          title: 'Payable assigned to you',
          link: `/payables/${payableId}`,
          db,
        });
      }
      created.push(await fetchPayable(db, payableId));
    }
    return created;
  });
  res.status(201).json({ items: result, count: result.length });
});

router.post('/', requirePermission(`${spec.document}_create`), async (req, res) => {
  const parsed = payableSchema.parse(req.body);
  const result = await withTransaction(async (db) => {
    const input = await applyFuelAmounts(db, parsed);
    const createStatus = await resolveCreateStatus(db, input.status_id, input.is_draft, req.user!);
    const data = await normalize(db, { ...input, status_id: createStatus.id });
    const status = await resolveStatus(db, data.status_id);
    const fallbackAssignee = await resolveAssignedTo(req.user!, input.assigned_to, {
      isDraft: input.is_draft,
    });
    // Payables: anytime (sort 0) requires pick; workflow steps use exclusive binding.
    const assignedTo =
      spec.kind === 'payable' && !input.is_draft
        ? await resolvePayableAssigneeOnStatusMove(db, status, input.assigned_to, fallbackAssignee)
        : fallbackAssignee;
    if (spec.kind === 'payable' && !input.is_draft) {
      await assertCheckDateForPaid(status, input.check_date);
    }
    const row = {
      ...data,
      assigned_to: assignedTo,
      is_draft: input.is_draft,
      check_date: input.check_date,
      created_by: req.user!.id,
    };
    const values = writeValues(row as unknown as Record<string, unknown>);
    const placeholders = WRITE_COLUMNS.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await db.query(
      `INSERT INTO ${spec.document} (${WRITE_COLUMNS.join(', ')}) VALUES (${placeholders}) RETURNING id`,
      values,
    );
    const payableId = rows[0].id as number;
    await replaceInvoices(db, payableId, data.invoices);
    if (spec.kind === 'payable' && !input.is_draft) {
      await assertPayablePdcSchedule(db, input.payment_method_id, data.amount, input.pdc_lines);
      await replacePayablePdcLines(db, payableId, input.pdc_lines);
    } else if (spec.kind === 'payable' && input.pdc_lines?.length) {
      await replacePayablePdcLines(db, payableId, input.pdc_lines);
    }
    await insertStatusHistory(db, {
      payableId,
      fromStatusId: null,
      toStatusId: data.status_id,
      paymentReference: data.payment_reference,
      paidAt: data.paid_at,
      changedBy: req.user!.id,
      checkDate: input.check_date,
    });
    await syncDocumentFunds(db, spec, {
      documentId: payableId,
      fromStatusName: null,
      toStatusName: status.name,
      toCategory: status.category,
      sourceAccountId: input.source_account_id,
      userId: req.user!.id,
      today: await todayForApp(db),
    });
    if (spec.kind === 'payable') {
      await notifyAssignee({
        assigneeId: assignedTo,
        actorId: req.user!.id,
        type: 'payable_assigned',
        title: 'Payable assigned to you',
        link: `/payables/${payableId}`,
        db,
      });
    }
    return fetchPayable(db, payableId);
  });
  res.status(201).json(result);
});

router.put('/:id', requirePermission(`${spec.document}_edit`), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const parsed = payableSchema.parse(req.body);
  const result = await withTransaction(async (db) => {
    const current = await db.query<
      ExistingTerm & {
        status_id: number;
        assigned_to: number | null;
        is_draft: boolean;
        created_by: number | null;
        check_date: string | null;
        source_account_id: number | null;
      }
    >(
      `SELECT client_id, payment_term_id, status_id, assigned_to, is_draft, created_by, check_date, source_account_id
         FROM ${spec.document} WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!current.rows[0]) throw notFound(spec.noun);
    const existing = current.rows[0];
    assertCanEditPayable(
      req.user!,
      {
        assignedTo: existing.assigned_to,
        createdBy: existing.created_by,
        isDraft: existing.is_draft,
      },
      spec.noun,
    );
    const fromStatus = await resolveStatus(db, existing.status_id);
    const input = await applyFuelAmounts(db, parsed);
    let normalizedInput = input;
    if (spec.kind === 'payable' && !isAdmin(req.user!) && existing.is_draft && !input.is_draft) {
      const submitStatus = await resolveCreateStatus(db, input.status_id, false, req.user!);
      normalizedInput = { ...input, status_id: submitStatus.id };
    }
    const data = await normalize(db, normalizedInput, existing);
    const toStatus = await resolveStatus(db, data.status_id);
    const statusChanged = data.status_id !== existing.status_id;
    let putWorkflowStatus = null as Awaited<ReturnType<typeof getPayableStatusWorkflow>> | null;
    let putCustomValues: Record<number, string> = {};
    if (statusChanged) {
      assertCanChangeAssignedStatus(req.user!, existing.assigned_to, spec.noun);
      await assertCanSetPayableStatus(db, req.user!, data.status_id, spec.kind);
      if (spec.kind === 'payable') await assertCheckDateForPaid(toStatus, input.check_date ?? existing.check_date);
      await assertRemarksForCancelled(toStatus, input.status_remarks);
      if (spec.kind === 'payable') {
        await assertPayableStatusTransition(db, existing.status_id, data.status_id);
        putWorkflowStatus = await getPayableStatusWorkflow(db, data.status_id);
        putCustomValues = normalizeCustomFieldValuesInput(
          putWorkflowStatus.custom_fields,
          input.custom_field_values,
          input.custom_field_value,
        );
        await assertPayableStatusDestinationGates(db, id, putWorkflowStatus, putCustomValues);
      }
    }
    // Drafts stay unassigned. Payables: anytime move requires pick; else exclusive binding / admin override.
    let assignedTo: number | null;
    if (input.is_draft) {
      assignedTo = null;
    } else if (spec.kind === 'payable') {
      if (statusChanged || existing.is_draft) {
        assignedTo = await resolvePayableAssigneeOnStatusMove(
          db,
          toStatus,
          input.assigned_to,
          existing.assigned_to ?? req.user!.id,
        );
      } else if (isAdmin(req.user!) && input.assigned_to !== undefined) {
        assignedTo = await resolveAssignedTo(req.user!, input.assigned_to, {
          currentAssignedTo: existing.assigned_to,
        });
      } else {
        assignedTo = existing.assigned_to;
      }
    } else {
      assignedTo = await resolveAssignedTo(req.user!, input.assigned_to, {
        currentAssignedTo: existing.assigned_to,
      });
    }
    const checkDate = input.check_date ?? existing.check_date;
    const toReserve = isReserveStatus(toStatus.name, spec.reserveName);
    // Preserve source account across status updates unless cancelled or explicitly set for reserve.
    const sourceAccountId = toReserve
      ? (input.source_account_id ?? existing.source_account_id)
      : toStatus.category === 'cancelled'
        ? null
        : (existing.source_account_id ?? input.source_account_id ?? null);
    const row = {
      ...data,
      assigned_to: assignedTo,
      check_date: checkDate,
      created_by: existing.created_by,
      source_account_id: sourceAccountId,
    };
    const values = writeValues(row as unknown as Record<string, unknown>);
    const sets = WRITE_COLUMNS.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const { rowCount } = await db.query(`UPDATE ${spec.document} SET ${sets} WHERE id = $${WRITE_COLUMNS.length + 1}`, [
      ...values,
      id,
    ]);
    if (!rowCount) throw notFound(spec.noun);
    await replaceInvoices(db, id, data.invoices);
    if (spec.kind === 'payable') {
      if (!input.is_draft) {
        await assertPayablePdcSchedule(db, input.payment_method_id, data.amount, input.pdc_lines);
      }
      if (input.pdc_lines !== undefined) {
        await replacePayablePdcLines(db, id, input.pdc_lines);
      }
    }
    if (statusChanged) {
      if (spec.kind === 'payable' && putWorkflowStatus && Object.keys(putCustomValues).length) {
        await upsertPayableStatusFieldValues(db, id, putCustomValues);
      }
      await insertStatusHistory(db, {
        payableId: id,
        fromStatusId: existing.status_id,
        toStatusId: data.status_id,
        remarks: input.status_remarks,
        paymentReference: data.payment_reference,
        paidAt: data.paid_at,
        changedBy: req.user!.id,
        checkDate,
        customFieldValues: putCustomValues,
      });
    }
    // Sync fund withdrawal on status change, or when re-saving reserve status with a (possibly new) source.
    if (statusChanged || toReserve) {
      await syncDocumentFunds(db, spec, {
        documentId: id,
        fromStatusName: fromStatus.name,
        toStatusName: toStatus.name,
        toCategory: toStatus.category,
        sourceAccountId: sourceAccountId,
        userId: req.user!.id,
        today: await todayForApp(db),
      });
    }
    if (spec.kind === 'payable' && assignedTo !== existing.assigned_to) {
      await notifyAssignee({
        assigneeId: assignedTo,
        actorId: req.user!.id,
        type: 'payable_assigned',
        title: 'Payable assigned to you',
        link: `/payables/${id}`,
        db,
      });
    }
    if (spec.kind === 'payable' && statusChanged) {
      await notifyAssignee({
        assigneeId: assignedTo,
        actorId: req.user!.id,
        type: 'payable_status_changed',
        title: `Payable status changed to ${toStatus.name}`,
        link: `/payables/${id}`,
        db,
      });
    }
    return fetchPayable(db, id);
  });
  res.json(result);
});

router.patch('/:id/status', requirePermission(`${spec.document}_status`), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = statusPatchSchema.parse(req.body);
  await assertPayableAccess(req.user!, id);
  const result = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `SELECT payment_method_id, payment_reference, paid_at, status_id, assigned_to, created_by, source_account_id,
              amount::text
         FROM ${spec.document} WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!rows[0]) throw notFound(spec.noun);
    assertCanAccessPayable(
      req.user!,
      { assignedTo: rows[0].assigned_to, createdBy: rows[0].created_by },
      spec.noun,
    );
    const fromStatus = await resolveStatus(db, rows[0].status_id);
    const status = await resolveStatus(db, body.status_id);
    assertCanChangeAssignedStatus(req.user!, rows[0].assigned_to, spec.noun);
    await assertCanSetPayableStatus(db, req.user!, body.status_id, spec.kind);
    if (spec.kind === 'payable') await assertCheckDateForPaid(status, body.check_date);
    await assertRemarksForCancelled(status, body.remarks);

    let workflowStatus = null as Awaited<ReturnType<typeof getPayableStatusWorkflow>> | null;
    let patchCustomValues: Record<number, string> = {};
    if (spec.kind === 'payable' && status.id !== rows[0].status_id) {
      await assertPayableStatusTransition(db, rows[0].status_id, status.id);
      workflowStatus = await getPayableStatusWorkflow(db, status.id);
      patchCustomValues = normalizeCustomFieldValuesInput(
        workflowStatus.custom_fields,
        body.custom_field_values,
        body.custom_field_value,
      );
      await assertPayableStatusDestinationGates(db, id, workflowStatus, patchCustomValues);
    }

    if (spec.kind === 'payable' && body.pdc_lines !== undefined) {
      await assertPayablePdcSchedule(db, rows[0].payment_method_id, rows[0].amount, body.pdc_lines);
      await replacePayablePdcLines(db, id, body.pdc_lines);
    }

    const patchSourceAccountId =
      body.source_account_id !== undefined && body.source_account_id !== null
        ? body.source_account_id
        : (rows[0].source_account_id as number | null);
    if (isReserveStatus(status.name, spec.reserveName) && patchSourceAccountId == null) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { source_account_id: [spec.reserveError] },
      });
    }
    const reference = body.payment_reference ?? rows[0].payment_reference;
    // Moving between two paid statuses keeps the original paid date.
    const paidAt = await paidAtFor(db, status, rows[0].payment_method_id, reference, body.paid_at ?? rows[0].paid_at);

    let nextAssignee = rows[0].assigned_to as number | null;
    if (spec.kind === 'payable') {
      if (status.id !== rows[0].status_id) {
        nextAssignee = await resolvePayableAssigneeOnStatusMove(
          db,
          status,
          body.assigned_to,
          rows[0].assigned_to as number | null,
        );
      } else if (isAdmin(req.user!) && body.assigned_to !== undefined) {
        assertCanReassignPayable(req.user!, rows[0].assigned_to, spec.noun);
        nextAssignee = await resolveAssignedTo(req.user!, body.assigned_to, {
          currentAssignedTo: rows[0].assigned_to as number | null,
        });
      }
    } else if (body.assigned_to !== undefined) {
      assertCanReassignPayable(req.user!, rows[0].assigned_to, spec.noun);
      nextAssignee = await resolveAssignedTo(req.user!, body.assigned_to, {
        currentAssignedTo: rows[0].assigned_to,
      });
    }

    await db.query(
      `UPDATE ${spec.document}
          SET status_id = $1, paid_at = $2, payment_reference = $3, check_date = $4, assigned_to = $5
        WHERE id = $6`,
      [status.id, paidAt, reference, body.check_date ?? null, nextAssignee, id],
    );
    if (status.id !== rows[0].status_id) {
      if (spec.kind === 'payable' && workflowStatus && Object.keys(patchCustomValues).length) {
        await upsertPayableStatusFieldValues(db, id, patchCustomValues);
      }
      await insertStatusHistory(db, {
        payableId: id,
        fromStatusId: rows[0].status_id,
        toStatusId: status.id,
        remarks: body.remarks,
        paymentReference: reference,
        paidAt,
        changedBy: req.user!.id,
        checkDate: body.check_date,
        customFieldValues: patchCustomValues,
      });
      await syncDocumentFunds(db, spec, {
        documentId: id,
        fromStatusName: fromStatus.name,
        toStatusName: status.name,
        toCategory: status.category,
        sourceAccountId: patchSourceAccountId,
        userId: req.user!.id,
        today: await todayForApp(db),
      });
      if (spec.kind === 'payable') {
        await notifyAssignee({
          assigneeId: nextAssignee,
          actorId: req.user!.id,
          type: 'payable_status_changed',
          title: `Payable status changed to ${status.name}`,
          link: `/payables/${id}`,
          db,
        });
      }
    }
    if (spec.kind === 'payable' && nextAssignee !== rows[0].assigned_to) {
      await notifyAssignee({
        assigneeId: nextAssignee,
        actorId: req.user!.id,
        type: 'payable_assigned',
        title: 'Payable assigned to you',
        link: `/payables/${id}`,
        db,
      });
    }
    return fetchPayable(db, id);
  });
  res.json(result);
});

router.delete('/:id', requirePermission(`${spec.document}_delete`), async (req, res) => {
  const { id } = idParam.parse(req.params);
  await assertPayableEditAccess(req.user!, id);
  const storedNames = await withTransaction(async (db) => {
    const files = await db.query<{ stored_name: string }>(`SELECT stored_name FROM attachments WHERE ${spec.parentFk} = $1`, [id]);
    await undoDocumentFunds(db, spec, id);
    const { rowCount } = await db.query(`DELETE FROM ${spec.document} WHERE id = $1`, [id]);
    if (!rowCount) throw notFound(spec.noun);
    return files.rows.map((r) => r.stored_name);
  });
  await removeStoredFiles(storedNames);
  res.json({ deleted: true });
});

  return router;
}

export const payablesRouter = createDocumentRouter(PAYABLE_LEDGER);
export const receivablesRouter = createDocumentRouter(RECEIVABLE_LEDGER);
