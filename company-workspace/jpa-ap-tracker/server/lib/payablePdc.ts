import type { Queryable } from '../db';
import { HttpError } from './http';
import { moneyString, roundMoney } from './tax';

export interface PayablePdcLine {
  id: number;
  pdc_no: string | null;
  pdc_date: string | null;
  amount: string;
  sort_order: number;
}

export interface PayablePdcLineInput {
  pdc_no?: string | null;
  pdc_date?: string | null;
  amount: string;
}

/** Check no. and date of a shared PDC. Its amount is always the sum of its invoices' nets. */
export interface SharedPdcFields {
  pdc_no?: string | null;
  pdc_date?: string | null;
}

/** A shared PDC as read back. `key` is its stored id as a string; echoing it in a PUT keeps the PDC. */
export interface PayablePdcGroup {
  key: string;
  pdc_no: string | null;
  pdc_date: string | null;
  amount: string;
  invoice_ids: number[];
}

/** How post-dated checks pay one invoice: its own schedule, or its place on one shared PDC. */
export type InvoicePdc = { kind: 'own'; lines: PayablePdcLineInput[] } | { kind: 'shared'; group: string };

/** What a request says about one invoice's PDC. */
export interface InvoicePdcInput {
  pdc_lines?: PayablePdcLineInput[] | null;
  pdc_group?: string | null;
}

export interface PdcInvoice {
  invoice_no: string | null;
  net_amount: string;
}

export interface PdcPlan {
  /** Parallel to the invoice list. */
  coverage: InvoicePdc[];
  groups: { key: string; pdc_no: string | null; pdc_date: string | null; members: number[] }[];
}

export interface StoredPdc {
  linesByInvoice: Map<number, PayablePdcLine[]>;
  groupByInvoice: Map<number, string>;
  groups: PayablePdcGroup[];
}

export function isPdcPaymentMethodName(name: string | null | undefined): boolean {
  const n = (name ?? '').toLowerCase();
  return n.includes('post dated') || n.includes('pdc');
}

export async function isPdcPaymentMethod(db: Queryable, methodId: number): Promise<boolean> {
  const { rows } = await db.query<{ name: string }>(`SELECT name FROM payment_methods WHERE id = $1`, [methodId]);
  if (!rows[0]) throw new HttpError(400, 'Unknown payment method');
  return isPdcPaymentMethodName(rows[0].name);
}

/** Parses user-entered PDC amounts (strips thousands separators). */
export function parsePdcLineAmount(amount: string | number): number {
  if (typeof amount === 'number') return amount;
  const normalized = String(amount).replace(/,/g, '').trim();
  return Number(normalized);
}

const centavos = (amount: string | number) => Math.round(roundMoney(parsePdcLineAmount(amount)) * 100);

/**
 * A sent `pdc_group` or non-empty `pdc_lines` replaces the stored coverage. `pdc_group: null` with no lines
 * leaves any shared PDC and keeps only a stored own schedule. Sending neither keeps whatever is stored, so a
 * request that omits one shape never wipes the other.
 */
export function resolveInvoicePdc(sent: InvoicePdcInput | undefined, stored: InvoicePdc | undefined): InvoicePdc {
  if (sent?.pdc_group != null) return { kind: 'shared', group: sent.pdc_group };
  if (sent?.pdc_lines?.length) return { kind: 'own', lines: sent.pdc_lines };
  if (sent?.pdc_group === null) return { kind: 'own', lines: stored?.kind === 'own' ? stored.lines : [] };
  return stored ?? { kind: 'own', lines: [] };
}

/**
 * Collects each shared PDC's invoices. A shared PDC left with one invoice becomes that invoice's own
 * one-check schedule for its full net, keeping the check no. and date.
 */
export function planPdc(invoices: PdcInvoice[], coverage: InvoicePdc[], fields: Map<string, SharedPdcFields>): PdcPlan {
  const members = new Map<string, number[]>();
  const unknown: Record<string, string[]> = {};
  coverage.forEach((c, i) => {
    if (c.kind !== 'shared') return;
    if (!fields.has(c.group)) unknown[`invoices.${i}.pdc_group`] = [`Unknown shared PDC "${c.group}"; reload and retry`];
    members.set(c.group, [...(members.get(c.group) ?? []), i]);
  });
  if (Object.keys(unknown).length) throw new HttpError(400, 'Validation failed', { fieldErrors: unknown });

  const plan: PdcPlan = { coverage: [...coverage], groups: [] };
  for (const [key, idx] of members) {
    const pdc_no = fields.get(key)?.pdc_no?.trim() || null;
    const pdc_date = fields.get(key)?.pdc_date || null;
    if (idx.length === 1) {
      plan.coverage[idx[0]] = { kind: 'own', lines: [{ pdc_no, pdc_date, amount: invoices[idx[0]].net_amount }] };
    } else {
      plan.groups.push({ key, pdc_no, pdc_date, members: idx });
    }
  }
  return plan;
}

/**
 * Submit rules. An invoice on its own schedule needs ≥1 line summing to its net (±₱0.01); a shared PDC's
 * amount is derived from its invoices, so it always balances. Keys match `invoices.N.pdc_lines`.
 */
export function pdcCoverageErrors(invoices: PdcInvoice[], coverage: InvoicePdc[]): Record<string, string[]> {
  if (!invoices.length) {
    return { invoices: ['Add at least one invoice for Post Dated Check payments'] };
  }
  const errors: Record<string, string[]> = {};
  invoices.forEach((invoice, i) => {
    const pdc = coverage[i];
    if (pdc?.kind === 'shared') return;
    const lines = pdc?.lines ?? [];
    const label = `Invoice ${i + 1}${invoice.invoice_no ? ` (${invoice.invoice_no})` : ''}`;
    if (!lines.length) {
      errors[`invoices.${i}.pdc_lines`] = [`${label}: add at least one PDC line or share a PDC`];
      return;
    }
    const sum = lines.reduce((acc, line) => acc + centavos(line.amount), 0);
    if (Math.abs(sum - centavos(invoice.net_amount)) > 1) {
      errors[`invoices.${i}.pdc_lines`] = [
        `${label}: PDC total (${moneyString(sum / 100)}) must equal invoice net (${moneyString(Number(invoice.net_amount))})`,
      ];
    }
  });
  return errors;
}

/** Shared PDC fields by key: stored ones first, so a request's `pdc_groups` overrides them. */
export function sharedPdcFields(
  stored: StoredPdc | null,
  sent: (SharedPdcFields & { key: string })[] | undefined,
): Map<string, SharedPdcFields> {
  return new Map<string, SharedPdcFields>([
    ...(stored?.groups ?? []).map((g) => [g.key, g] as const),
    ...(sent ?? []).map((g) => [g.key, g] as const),
  ]);
}

export function storedCoverage(stored: StoredPdc | null, invoiceId: number | null | undefined): InvoicePdc | undefined {
  if (!stored || invoiceId == null) return undefined;
  const group = stored.groupByInvoice.get(invoiceId);
  if (group) return { kind: 'shared', group };
  const lines = stored.linesByInvoice.get(invoiceId);
  return lines ? { kind: 'own', lines } : undefined;
}

export async function loadPayablePdc(db: Queryable, payableId: number): Promise<StoredPdc> {
  const [lines, groups] = await Promise.all([
    db.query<PayablePdcLine & { payable_invoice_id: number }>(
      `SELECT id, payable_invoice_id, pdc_no, pdc_date::text, amount::text, sort_order
         FROM payable_pdc_lines
        WHERE payable_id = $1
        ORDER BY sort_order, id`,
      [payableId],
    ),
    db.query<PayablePdcGroup>(
      `SELECT g.id::text AS key, g.pdc_no, g.pdc_date::text, SUM(pi.net_amount)::text AS amount,
              array_agg(pi.id ORDER BY pi.sort_order, pi.id) AS invoice_ids
         FROM payable_pdc_groups g
         JOIN payable_pdc_group_invoices gi ON gi.group_id = g.id
         JOIN payable_invoices pi ON pi.id = gi.payable_invoice_id
        WHERE g.payable_id = $1
        GROUP BY g.id
        ORDER BY g.sort_order, g.id`,
      [payableId],
    ),
  ]);
  const linesByInvoice = new Map<number, PayablePdcLine[]>();
  for (const { payable_invoice_id, ...line } of lines.rows) {
    linesByInvoice.set(payable_invoice_id, [...(linesByInvoice.get(payable_invoice_id) ?? []), line]);
  }
  const groupByInvoice = new Map(groups.rows.flatMap((g) => g.invoice_ids.map((invoiceId) => [invoiceId, g.key] as const)));
  return { linesByInvoice, groupByInvoice, groups: groups.rows };
}

/** Replaces every PDC row of the payable; `plan: null` clears them. `invoiceIds` is parallel to `plan.coverage`. */
export async function savePdcPlan(db: Queryable, payableId: number, invoiceIds: number[], plan: PdcPlan | null) {
  await db.query(`DELETE FROM payable_pdc_lines WHERE payable_id = $1`, [payableId]);
  await db.query(`DELETE FROM payable_pdc_groups WHERE payable_id = $1`, [payableId]);
  if (!plan) return;
  for (const [i, pdc] of plan.coverage.entries()) {
    if (pdc.kind !== 'own') continue;
    for (const [order, line] of pdc.lines.entries()) {
      await db.query(
        `INSERT INTO payable_pdc_lines (payable_id, payable_invoice_id, pdc_no, pdc_date, amount, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          payableId,
          invoiceIds[i],
          line.pdc_no?.trim() || null,
          line.pdc_date || null,
          moneyString(roundMoney(parsePdcLineAmount(line.amount))),
          order,
        ],
      );
    }
  }
  for (const [order, group] of plan.groups.entries()) {
    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO payable_pdc_groups (payable_id, pdc_no, pdc_date, sort_order) VALUES ($1, $2, $3, $4) RETURNING id`,
      [payableId, group.pdc_no, group.pdc_date, order],
    );
    await db.query(
      `INSERT INTO payable_pdc_group_invoices (group_id, payable_id, payable_invoice_id)
       SELECT $1, $2, unnest($3::int[])`,
      [rows[0].id, payableId, group.members.map((i) => invoiceIds[i])],
    );
  }
}

export async function writePayablePdc(
  db: Queryable,
  payableId: number,
  invoices: (PdcInvoice & { id: number })[],
  coverage: InvoicePdc[],
  fields: Map<string, SharedPdcFields>,
  validate: boolean,
) {
  const plan = planPdc(invoices, coverage, fields);
  if (validate) {
    const fieldErrors = pdcCoverageErrors(invoices, plan.coverage);
    if (Object.keys(fieldErrors).length) throw new HttpError(400, 'Validation failed', { fieldErrors });
  }
  await savePdcPlan(db, payableId, invoices.map((inv) => inv.id), plan);
}
