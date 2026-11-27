import type { Queryable } from '../db';
import { pool } from '../db';
import { computeArTotals } from './arTotals';
import { notFound } from './http';

/**
 * Recalculate money columns from billing lines + deductions.
 * If no detail lines remain, delete the summary (monthly invoice follows billing lines).
 * Returns null when the summary was removed.
 */
export async function recomputeSummaryTotals(db: Queryable, summaryId: number) {
  const details = await db.query<{ sum: string; n: number }>(
    `SELECT COALESCE(sum(amount), 0)::text AS sum, count(*)::int AS n
       FROM ar_detail_entries WHERE summary_id = $1`,
    [summaryId],
  );
  if ((details.rows[0]?.n ?? 0) === 0) {
    const file = await db.query<{ ewt_2307_stored_name: string | null }>(
      `SELECT ewt_2307_stored_name FROM ar_summaries WHERE id = $1`,
      [summaryId],
    );
    await db.query(`DELETE FROM ar_summaries WHERE id = $1`, [summaryId]);
    return { deleted: true as const, storedName: file.rows[0]?.ewt_2307_stored_name ?? null };
  }
  const deductions = await db.query<{ sum: string }>(
    `SELECT COALESCE(sum(amount), 0)::text AS sum FROM ar_deductions WHERE summary_id = $1`,
    [summaryId],
  );
  const totals = computeArTotals(Number(details.rows[0]?.sum ?? 0), Number(deductions.rows[0]?.sum ?? 0));
  await db.query(
    `UPDATE ar_summaries SET
       total_sales_vatex = $2,
       vat_amount = $3,
       total_sales_vatinc = $4,
       ewt_amount = $5,
       total_after_ewt = $6,
       deductions_total = $7,
       grand_total = $8
     WHERE id = $1`,
    [
      summaryId,
      totals.total_sales_vatex,
      totals.vat_amount,
      totals.total_sales_vatinc,
      totals.ewt_amount,
      totals.total_after_ewt,
      totals.deductions_total,
      totals.grand_total,
    ],
  );
  return totals;
}

export async function fetchSummary(id: number, db: Queryable = pool) {
  const { rows } = await db.query(
    `SELECT s.*,
            c.name AS client_name,
            c.tin AS client_tin,
            c.default_trip_classification
       FROM ar_summaries s
       JOIN ar_clients c ON c.id = s.client_id
      WHERE s.id = $1`,
    [id],
  );
  if (!rows[0]) throw notFound('AR summary');
  const details = await db.query(
    `SELECT id, summary_id, invoice_no, entry_date, reference, origin, destination, amount::text, created_at
       FROM ar_detail_entries WHERE summary_id = $1
      ORDER BY entry_date, id`,
    [id],
  );
  const deductions = await db.query(
    `SELECT id, summary_id, description, amount::text, created_at
       FROM ar_deductions WHERE summary_id = $1
      ORDER BY id`,
    [id],
  );
  return { ...rows[0], details: details.rows, deductions: deductions.rows };
}
