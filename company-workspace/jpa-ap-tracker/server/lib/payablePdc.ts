import type { Queryable } from '../db';
import { HttpError } from './http';
import { moneyString, roundMoney } from './tax';

export interface PayablePdcLine {
  id?: number;
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

export function isPdcPaymentMethodName(name: string | null | undefined): boolean {
  const n = (name ?? '').toLowerCase();
  return n.includes('post dated') || n.includes('pdc');
}

export async function getPaymentMethodName(db: Queryable, methodId: number): Promise<string> {
  const { rows } = await db.query<{ name: string }>(`SELECT name FROM payment_methods WHERE id = $1`, [methodId]);
  if (!rows[0]) throw new HttpError(400, 'Unknown payment method');
  return rows[0].name;
}

export async function listPayablePdcLines(db: Queryable, payableId: number): Promise<PayablePdcLine[]> {
  const { rows } = await db.query<PayablePdcLine>(
    `SELECT id, pdc_no, pdc_date::text, amount::text, sort_order
       FROM payable_pdc_lines
      WHERE payable_id = $1
      ORDER BY sort_order, id`,
    [payableId],
  );
  return rows;
}

export async function replacePayablePdcLines(
  db: Queryable,
  payableId: number,
  lines: PayablePdcLineInput[] | null | undefined,
): Promise<void> {
  await db.query(`DELETE FROM payable_pdc_lines WHERE payable_id = $1`, [payableId]);
  if (!lines?.length) return;
  let order = 0;
  for (const line of lines) {
    const amount = roundMoney(Number(line.amount));
    if (amount <= 0) continue;
    await db.query(
      `INSERT INTO payable_pdc_lines (payable_id, pdc_no, pdc_date, amount, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [payableId, line.pdc_no?.trim() || null, line.pdc_date || null, moneyString(roundMoney(amount)), order],
    );
    order += 1;
  }
}

/** When method is PDC, schedule is required and must sum to payable net (±₱0.01). */
export async function assertPayablePdcSchedule(
  db: Queryable,
  methodId: number,
  netAmount: string | number,
  lines: PayablePdcLineInput[] | null | undefined,
) {
  const name = await getPaymentMethodName(db, methodId);
  if (!isPdcPaymentMethodName(name)) return;
  if (!lines?.length) {
    throw new HttpError(400, 'Validation failed', {
      fieldErrors: { pdc_lines: ['Add at least one PDC line for Post Dated Check payments'] },
    });
  }
  const target = roundMoney(Number(netAmount));
  let sum = 0;
  for (const line of lines) {
    sum += roundMoney(Number(line.amount));
  }
  if (Math.abs(sum - target) > 0.01) {
    throw new HttpError(400, 'Validation failed', {
      fieldErrors: {
        pdc_lines: [
          `PDC scheduled total (${moneyString(roundMoney(sum))}) must equal payable net (${moneyString(target)})`,
        ],
      },
    });
  }
}