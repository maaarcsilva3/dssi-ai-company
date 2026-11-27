import { Router } from 'express';
import { pool, withTransaction } from '../db';
import { isAdmin, requireAuth, requirePermission } from '../lib/auth';
import { HttpError, notFound } from '../lib/http';
import { idParam, liquidationLineSchema, liquidationSchema } from '../lib/validation';

export const liquidationsRouter = Router();
liquidationsRouter.use(requireAuth);

function statusFromAmounts(advance: number, spent: number): 'open' | 'partial' | 'closed' {
  if (spent <= 0) return 'open';
  if (spent + 1e-9 >= advance) return 'closed';
  return 'partial';
}

async function fetchLiquidation(id: number) {
  const { rows } = await pool.query(
    `SELECT l.*,
            u.display_name AS assigned_to_name,
            cb.display_name AS created_by_name,
            sa.bank_name AS source_account_bank_name,
            sa.account_number AS source_account_number,
            COALESCE((SELECT sum(amount) FROM liquidation_lines ll WHERE ll.liquidation_id = l.id), 0)::text AS spent_amount,
            (l.advance_amount - COALESCE((SELECT sum(amount) FROM liquidation_lines ll WHERE ll.liquidation_id = l.id), 0))::text AS remaining_amount
       FROM liquidations l
       LEFT JOIN users u ON u.id = l.assigned_to
       LEFT JOIN users cb ON cb.id = l.created_by
       LEFT JOIN source_accounts sa ON sa.id = l.source_account_id
      WHERE l.id = $1`,
    [id],
  );
  if (!rows[0]) throw notFound('Liquidation');
  const lines = await pool.query(
    `SELECT id, line_date, description, amount::text, created_at
       FROM liquidation_lines WHERE liquidation_id = $1 ORDER BY line_date, id`,
    [id],
  );
  return { ...rows[0], lines: lines.rows };
}

liquidationsRouter.get('/', requirePermission('liquidations_view'), async (req, res) => {
  const params: unknown[] = [];
  let where = '';
  if (!isAdmin(req.user!)) {
    params.push(req.user!.id);
    where = `WHERE l.assigned_to = $${params.length} OR l.created_by = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT l.*,
            u.display_name AS assigned_to_name,
            COALESCE((SELECT sum(amount) FROM liquidation_lines ll WHERE ll.liquidation_id = l.id), 0)::text AS spent_amount,
            (l.advance_amount - COALESCE((SELECT sum(amount) FROM liquidation_lines ll WHERE ll.liquidation_id = l.id), 0))::text AS remaining_amount
       FROM liquidations l
       LEFT JOIN users u ON u.id = l.assigned_to
       ${where}
      ORDER BY l.advance_date DESC, l.id DESC
      LIMIT 200`,
    params,
  );
  res.json({ items: rows });
});

liquidationsRouter.get('/:id', requirePermission('liquidations_view'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const row = await fetchLiquidation(id);
  if (!isAdmin(req.user!) && row.assigned_to !== req.user!.id && row.created_by !== req.user!.id) {
    throw notFound('Liquidation');
  }
  res.json(row);
});

liquidationsRouter.post('/', requirePermission('liquidations_manage'), async (req, res) => {
  const body = liquidationSchema.parse(req.body);
  const assignedTo = isAdmin(req.user!) ? body.assigned_to ?? req.user!.id : req.user!.id;
  const { rows } = await pool.query(
    `INSERT INTO liquidations
       (payee_name, assigned_to, created_by, source_account_id, advance_amount, advance_date, status, remarks)
     VALUES ($1,$2,$3,$4,$5,$6,'open',$7)
     RETURNING id`,
    [
      body.payee_name,
      assignedTo,
      req.user!.id,
      body.source_account_id ?? null,
      body.advance_amount,
      body.advance_date,
      body.remarks ?? null,
    ],
  );
  res.status(201).json(await fetchLiquidation(rows[0].id));
});

liquidationsRouter.put('/:id', requirePermission('liquidations_manage'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = liquidationSchema.parse(req.body);
  const current = await fetchLiquidation(id);
  if (!isAdmin(req.user!) && current.assigned_to !== req.user!.id && current.created_by !== req.user!.id) {
    throw notFound('Liquidation');
  }
  const assignedTo = isAdmin(req.user!) ? body.assigned_to ?? current.assigned_to : current.assigned_to;
  await pool.query(
    `UPDATE liquidations
        SET payee_name = $1, assigned_to = $2, source_account_id = $3,
            advance_amount = $4, advance_date = $5, remarks = $6
      WHERE id = $7`,
    [
      body.payee_name,
      assignedTo,
      body.source_account_id ?? null,
      body.advance_amount,
      body.advance_date,
      body.remarks ?? null,
      id,
    ],
  );
  const spent = Number(current.spent_amount);
  const status = statusFromAmounts(Number(body.advance_amount), spent);
  await pool.query(`UPDATE liquidations SET status = $1 WHERE id = $2`, [status, id]);
  res.json(await fetchLiquidation(id));
});

liquidationsRouter.post('/:id/lines', requirePermission('liquidations_manage'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = liquidationLineSchema.parse(req.body);
  const result = await withTransaction(async (db) => {
    const { rows } = await db.query<{ advance_amount: string; assigned_to: number | null; created_by: number | null }>(
      `SELECT advance_amount::text, assigned_to, created_by FROM liquidations WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!rows[0]) throw notFound('Liquidation');
    if (!isAdmin(req.user!) && rows[0].assigned_to !== req.user!.id && rows[0].created_by !== req.user!.id) {
      throw notFound('Liquidation');
    }
    await db.query(
      `INSERT INTO liquidation_lines (liquidation_id, line_date, description, amount)
       VALUES ($1,$2,$3,$4)`,
      [id, body.line_date, body.description, body.amount],
    );
    const spent = await db.query<{ s: string }>(
      `SELECT COALESCE(sum(amount),0)::text AS s FROM liquidation_lines WHERE liquidation_id = $1`,
      [id],
    );
    const status = statusFromAmounts(Number(rows[0].advance_amount), Number(spent.rows[0].s));
    if (Number(spent.rows[0].s) - Number(rows[0].advance_amount) > 1e-9) {
      throw new HttpError(400, 'Liquidation lines cannot exceed the advance amount');
    }
    await db.query(`UPDATE liquidations SET status = $1 WHERE id = $2`, [status, id]);
    return id;
  });
  res.status(201).json(await fetchLiquidation(result));
});

liquidationsRouter.delete('/:id/lines/:lineId', requirePermission('liquidations_manage'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const lineId = Number(req.params.lineId);
  if (!Number.isInteger(lineId) || lineId <= 0) throw new HttpError(400, 'Invalid line id');
  await withTransaction(async (db) => {
    const { rows } = await db.query<{ advance_amount: string; assigned_to: number | null; created_by: number | null }>(
      `SELECT advance_amount::text, assigned_to, created_by FROM liquidations WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!rows[0]) throw notFound('Liquidation');
    if (!isAdmin(req.user!) && rows[0].assigned_to !== req.user!.id && rows[0].created_by !== req.user!.id) {
      throw notFound('Liquidation');
    }
    const del = await db.query(`DELETE FROM liquidation_lines WHERE id = $1 AND liquidation_id = $2`, [lineId, id]);
    if (!del.rowCount) throw notFound('Liquidation line');
    const spent = await db.query<{ s: string }>(
      `SELECT COALESCE(sum(amount),0)::text AS s FROM liquidation_lines WHERE liquidation_id = $1`,
      [id],
    );
    const status = statusFromAmounts(Number(rows[0].advance_amount), Number(spent.rows[0].s));
    await db.query(`UPDATE liquidations SET status = $1 WHERE id = $2`, [status, id]);
  });
  res.json(await fetchLiquidation(id));
});

liquidationsRouter.delete('/:id', requirePermission('liquidations_manage'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const current = await fetchLiquidation(id);
  if (!isAdmin(req.user!) && current.assigned_to !== req.user!.id && current.created_by !== req.user!.id) {
    throw notFound('Liquidation');
  }
  await pool.query(`DELETE FROM liquidations WHERE id = $1`, [id]);
  res.json({ deleted: true });
});
