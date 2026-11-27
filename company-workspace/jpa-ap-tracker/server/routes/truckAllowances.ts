import { Router } from 'express';
import { pool } from '../db';
import { requireAuth, requirePermission } from '../lib/auth';
import { notFound } from '../lib/http';
import { idParam, isoDate, truckAllowanceSchema } from '../lib/validation';
import { z } from 'zod';

export const truckAllowancesRouter = Router();
truckAllowancesRouter.use(requireAuth);

function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

async function fetchOne(id: number) {
  const { rows } = await pool.query(
    `SELECT t.*,
            sa.bank_name AS source_account_bank_name,
            sa.account_number AS source_account_number,
            u.display_name AS created_by_name
       FROM truck_allowances t
       LEFT JOIN source_accounts sa ON sa.id = t.source_account_id
       LEFT JOIN users u ON u.id = t.created_by
      WHERE t.id = $1`,
    [id],
  );
  if (!rows[0]) throw notFound('Truck allowance');
  return rows[0];
}

truckAllowancesRouter.get('/', requirePermission('petty_cash_view'), async (req, res) => {
  const q = z
    .object({
      periodMonth: isoDate.optional(),
      dateFrom: isoDate.optional(),
      dateTo: isoDate.optional(),
      truckId: z.string().trim().max(100).optional(),
    })
    .parse(req.query);
  const params: unknown[] = [];
  const where: string[] = [];
  if (q.periodMonth) {
    params.push(monthStart(q.periodMonth));
    where.push(`t.period_month = $${params.length}`);
  }
  if (q.dateFrom) {
    params.push(q.dateFrom);
    where.push(`t.allowance_date >= $${params.length}`);
  }
  if (q.dateTo) {
    params.push(q.dateTo);
    where.push(`t.allowance_date <= $${params.length}`);
  }
  if (q.truckId) {
    params.push(q.truckId);
    where.push(`lower(t.truck_id) = lower($${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT t.*,
            sa.bank_name AS source_account_bank_name,
            sa.account_number AS source_account_number
       FROM truck_allowances t
       LEFT JOIN source_accounts sa ON sa.id = t.source_account_id
       ${whereSql}
      ORDER BY t.allowance_date DESC, t.id DESC
      LIMIT 500`,
    params,
  );
  res.json({ items: rows });
});

truckAllowancesRouter.get('/report', requirePermission('petty_cash_view'), async (req, res) => {
  const q = z
    .object({
      periodMonth: isoDate.optional(),
      dateFrom: isoDate.optional(),
      dateTo: isoDate.optional(),
    })
    .refine((v) => Boolean(v.periodMonth || v.dateFrom || v.dateTo), {
      message: 'Provide periodMonth or a date range',
    })
    .parse(req.query);

  const params: unknown[] = [];
  const where: string[] = [];
  if (q.periodMonth) {
    params.push(monthStart(q.periodMonth));
    where.push(`t.period_month = $${params.length}`);
  }
  if (q.dateFrom) {
    params.push(q.dateFrom);
    where.push(`t.allowance_date >= $${params.length}`);
  }
  if (q.dateTo) {
    params.push(q.dateTo);
    where.push(`t.allowance_date <= $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows: byParticular } = await pool.query(
    `SELECT t.truck_id,
            count(*)::int AS entry_count,
            COALESCE(sum(t.amount), 0)::text AS total_amount
       FROM truck_allowances t
       ${whereSql}
      GROUP BY t.truck_id
      ORDER BY lower(t.truck_id)`,
    params,
  );
  const detail = await pool.query(
    `SELECT t.*
       FROM truck_allowances t
       ${whereSql}
      ORDER BY t.allowance_date ASC, t.id ASC`,
    params,
  );
  const grand = byParticular.reduce((s, r) => s + Number(r.total_amount), 0);
  res.json({
    periodMonth: q.periodMonth ? monthStart(q.periodMonth) : null,
    dateFrom: q.dateFrom ?? null,
    dateTo: q.dateTo ?? null,
    byTruck: byParticular,
    byParticular,
    items: detail.rows,
    entryCount: detail.rows.length,
    grandTotal: grand.toFixed(2),
  });
});

truckAllowancesRouter.get('/:id', requirePermission('petty_cash_view'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await fetchOne(id));
});

truckAllowancesRouter.post('/', requirePermission('petty_cash_manage'), async (req, res) => {
  const body = truckAllowanceSchema.parse(req.body);
  const period = monthStart(body.period_month ?? body.allowance_date);
  const { rows } = await pool.query(
    `INSERT INTO truck_allowances
       (truck_id, allowance_date, period_month, amount, payee_name, remarks, source_account_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      body.truck_id,
      body.allowance_date,
      period,
      body.amount,
      body.payee_name ?? null,
      body.remarks ?? null,
      body.source_account_id ?? null,
      req.user!.id,
    ],
  );
  res.status(201).json(await fetchOne(rows[0].id));
});

truckAllowancesRouter.put('/:id', requirePermission('petty_cash_manage'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = truckAllowanceSchema.parse(req.body);
  const period = monthStart(body.period_month ?? body.allowance_date);
  const { rowCount } = await pool.query(
    `UPDATE truck_allowances
        SET truck_id = $1, allowance_date = $2, period_month = $3, amount = $4,
            payee_name = $5, remarks = $6, source_account_id = $7
      WHERE id = $8`,
    [
      body.truck_id,
      body.allowance_date,
      period,
      body.amount,
      body.payee_name ?? null,
      body.remarks ?? null,
      body.source_account_id ?? null,
      id,
    ],
  );
  if (!rowCount) throw notFound('Truck allowance');
  res.json(await fetchOne(id));
});

truckAllowancesRouter.delete('/:id', requirePermission('petty_cash_manage'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { rowCount } = await pool.query(`DELETE FROM truck_allowances WHERE id = $1`, [id]);
  if (!rowCount) throw notFound('Truck allowance');
  res.json({ deleted: true });
});
