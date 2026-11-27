import type { Queryable } from '../db';
import { HttpError } from './http';
import { moneyString, roundMoney } from './tax';
import { writePayablePdc, type InvoicePdc } from './payablePdc';
export interface SharedPdcBatchMember {
  payable_id: number;
  invoice_no: string | null;
  net: string;
}

export interface SharedPdcBatchView {
  id: number;
  pdc_no: string | null;
  pdc_date: string | null;
  amount_total: string;
  members: SharedPdcBatchMember[];
}

type BatchInvoicePdcInput = {
  pdc_group?: string | null;
  pdc_lines?: { pdc_no?: string | null; pdc_date?: string | null; amount?: string }[];
};

export type SharedBatchPutInput = {
  shared_pdc_batch?: { pdc_no?: string | null; pdc_date?: string | null } | null;
  pdc_groups?: unknown[];
  invoices?: (BatchInvoicePdcInput & { pdc_group?: string | null })[];
};

/** Mode B batch create: each line has exactly one PDC row with identical no./date across payables. */
export function detectCrossPayableSharedPdc(invoices: BatchInvoicePdcInput[]): { pdc_no: string; pdc_date: string } | null {
  if (invoices.length < 2) return null;
  let pdc_no: string | null = null;
  let pdc_date: string | null = null;
  for (const inv of invoices) {
    if (inv.pdc_group != null) return null;
    const lines = inv.pdc_lines ?? [];
    if (lines.length !== 1) return null;
    const line = lines[0];
    const no = (line.pdc_no ?? '').trim();
    const date = line.pdc_date ?? '';
    if (!no || !date) return null;
    if (pdc_no === null) {
      pdc_no = no;
      pdc_date = date;
    } else if (pdc_no !== no || pdc_date !== date) {
      return null;
    }
  }
  return pdc_no && pdc_date ? { pdc_no, pdc_date } : null;
}

export async function getPayableSharedBatchId(db: Queryable, payableId: number): Promise<number | null> {
  const { rows } = await db.query<{ shared_pdc_batch_id: number | null }>(
    `SELECT shared_pdc_batch_id FROM payables WHERE id = $1`,
    [payableId],
  );
  return rows[0]?.shared_pdc_batch_id ?? null;
}

export async function createSharedPdcBatch(
  db: Queryable,
  fields: { pdc_no: string; pdc_date: string },
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO payable_shared_pdc_batches (pdc_no, pdc_date) VALUES ($1, $2) RETURNING id`,
    [fields.pdc_no, fields.pdc_date],
  );
  return rows[0].id;
}

export async function linkPayablesToSharedBatch(db: Queryable, batchId: number, payableIds: number[]) {
  if (!payableIds.length) return;
  await db.query(`UPDATE payables SET shared_pdc_batch_id = $1 WHERE id = ANY($2::int[])`, [batchId, payableIds]);
}

async function fetchMemberInvoices(db: Queryable, batchId: number) {
  const { rows } = await db.query<{ payable_id: number; id: number; invoice_no: string | null; net_amount: string }>(
    `SELECT p.id AS payable_id, pi.id, pi.invoice_no, pi.net_amount::text
       FROM payables p
       JOIN payable_invoices pi ON pi.payable_id = p.id
      WHERE p.shared_pdc_batch_id = $1
      ORDER BY p.id, pi.sort_order, pi.id`,
    [batchId],
  );
  return rows;
}

/** Rewrites each batch member's PDC as one line per invoice (amount = net) using the batch check no./date. */
export async function syncSharedBatchPdcLines(db: Queryable, batchId: number, validate: boolean) {
  const { rows: batchRows } = await db.query<{ pdc_no: string | null; pdc_date: string | null }>(
    `SELECT pdc_no, pdc_date::text FROM payable_shared_pdc_batches WHERE id = $1`,
    [batchId],
  );
  if (!batchRows[0]) throw new HttpError(500, 'Shared PDC batch missing');
  const { pdc_no, pdc_date } = batchRows[0];
  const invoices = await fetchMemberInvoices(db, batchId);
  const byPayable = new Map<number, typeof invoices>();
  for (const row of invoices) {
    byPayable.set(row.payable_id, [...(byPayable.get(row.payable_id) ?? []), row]);
  }
  for (const [payableId, memberInvoices] of byPayable) {
    const coverage: InvoicePdc[] = memberInvoices.map((inv) => ({
      kind: 'own',
      lines: [{ pdc_no, pdc_date, amount: inv.net_amount }],
    }));
    await writePayablePdc(db, payableId, memberInvoices, coverage, new Map(), validate);
  }
}

export async function loadSharedPdcBatch(db: Queryable, batchId: number): Promise<SharedPdcBatchView> {
  const { rows: batchRows } = await db.query<{ id: number; pdc_no: string | null; pdc_date: string | null }>(
    `SELECT id, pdc_no, pdc_date::text FROM payable_shared_pdc_batches WHERE id = $1`,
    [batchId],
  );
  if (!batchRows[0]) throw new HttpError(500, 'Shared PDC batch missing');
  const members = await fetchMemberInvoices(db, batchId);
  const total = members.reduce((acc, m) => acc + roundMoney(Number(m.net_amount)), 0);
  return {
    id: batchRows[0].id,
    pdc_no: batchRows[0].pdc_no,
    pdc_date: batchRows[0].pdc_date,
    amount_total: moneyString(total),
    members: members.map((m) => ({
      payable_id: m.payable_id,
      invoice_no: m.invoice_no,
      net: m.net_amount,
    })),
  };
}

export async function updateSharedPdcBatchFields(
  db: Queryable,
  batchId: number,
  fields: { pdc_no: string | null; pdc_date: string | null },
) {
  await db.query(`UPDATE payable_shared_pdc_batches SET pdc_no = $2, pdc_date = $3 WHERE id = $1`, [
    batchId,
    fields.pdc_no,
    fields.pdc_date,
  ]);
}

export function resolveSharedBatchFieldsFromPut(
  input: SharedBatchPutInput,
): { pdc_no: string | null; pdc_date: string | null } | null {
  const fromBatch = input.shared_pdc_batch;
  if (fromBatch) {
    return {
      pdc_no: fromBatch.pdc_no?.trim() || null,
      pdc_date: fromBatch.pdc_date || null,
    };
  }
  const lines = input.invoices?.[0]?.pdc_lines;
  if (lines?.length === 1) {
    return {
      pdc_no: lines[0].pdc_no?.trim() || null,
      pdc_date: lines[0].pdc_date || null,
    };
  }
  return null;
}

/** Reject PUT/PATCH that would break a locked cross-payable shared check link. */
export function assertSharedBatchPutAllowed(batchId: number, input: SharedBatchPutInput) {
  if (input.shared_pdc_batch === null) {
    throw new HttpError(403, `Payable is linked to shared PDC batch ${batchId}; it cannot be unlinked`);
  }
  if (input.pdc_groups?.length) {
    throw new HttpError(403, `Payable is linked to shared PDC batch ${batchId}; in-payable shared PDC groups are not allowed`);
  }
  for (const [i, inv] of (input.invoices ?? []).entries()) {
    if (inv.pdc_group != null) {
      throw new HttpError(403, `Payable is linked to shared PDC batch ${batchId}; invoices.${i}.pdc_group is not allowed`);
    }
    const lines = inv.pdc_lines ?? [];
    if (lines.length > 1) {
      throw new HttpError(403, `Payable is linked to shared PDC batch ${batchId}; use a single PDC line per invoice (shared check)`);
    }
  }
}