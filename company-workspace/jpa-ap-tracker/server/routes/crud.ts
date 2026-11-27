import { Router } from 'express';
import type { ZodType } from 'zod';
import { pool } from '../db';
import { notFound } from '../lib/http';
import { boolQuery, idParam } from '../lib/validation';

interface CrudOptions {
  table: string;
  label: string;
  columns: readonly string[];
  schema: ZodType<Record<string, unknown>>;
  /** Tables/columns referencing this table; rows in use are deactivated instead of deleted. */
  references: readonly { table: string; column: string }[];
  orderBy?: string;
  /** Runs before an update is written; throw to reject it. */
  beforeUpdate?: (id: number, data: Record<string, unknown>) => Promise<void>;
  /** Shape list/get/write responses (e.g. nest related rows). */
  shapeRow?: (row: Record<string, unknown>) => Promise<Record<string, unknown>>;
  /** Runs after insert/update; return value becomes the response body. */
  afterWrite?: (
    id: number,
    data: Record<string, unknown>,
    row: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>;
}

/** Generic CRUD for master data tables. Table/column names come from code, never from the request. */
export function crudRouter({
  table,
  label,
  columns,
  schema,
  references,
  orderBy = 'lower(name)',
  beforeUpdate,
  shapeRow,
  afterWrite,
}: CrudOptions): Router {
  const router = Router();
  const cols = columns.join(', ');
  const shape = async (row: Record<string, unknown>) => (shapeRow ? shapeRow(row) : row);

  router.get('/', async (req, res) => {
    const includeInactive = boolQuery.optional().parse(req.query.includeInactive) ?? false;
    const { rows } = await pool.query(
      `SELECT * FROM ${table} ${includeInactive ? '' : 'WHERE active'} ORDER BY ${orderBy}`,
    );
    res.json(await Promise.all(rows.map((r) => shape(r as Record<string, unknown>))));
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    if (!rows[0]) throw notFound(label);
    res.json(await shape(rows[0] as Record<string, unknown>));
  });

  router.post('/', async (req, res) => {
    const data = schema.parse(req.body);
    const values = columns.map((c) => data[c] ?? null);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    let row = rows[0] as Record<string, unknown>;
    if (afterWrite) row = await afterWrite(Number(row.id), data, row);
    else row = await shape(row);
    res.status(201).json(row);
  });

  router.put('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const data = schema.parse(req.body);
    await beforeUpdate?.(id, data);
    const values = columns.map((c) => data[c] ?? null);
    const sets = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE ${table} SET ${sets} WHERE id = $${columns.length + 1} RETURNING *`,
      [...values, id],
    );
    if (!rows[0]) throw notFound(label);
    let row = rows[0] as Record<string, unknown>;
    if (afterWrite) row = await afterWrite(id, data, row);
    else row = await shape(row);
    res.json(row);
  });

  router.delete('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (references.length) {
      const checks = references.map((r) => `EXISTS (SELECT 1 FROM ${r.table} WHERE ${r.column} = $1)`).join(' OR ');
      const inUse = await pool.query<{ in_use: boolean }>(`SELECT (${checks}) AS in_use`, [id]);
      if (inUse.rows[0].in_use) {
        const { rowCount } = await pool.query(`UPDATE ${table} SET active = FALSE WHERE id = $1`, [id]);
        if (!rowCount) throw notFound(label);
        res.json({ deleted: false, deactivated: true });
        return;
      }
    }
    const { rowCount } = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    if (!rowCount) throw notFound(label);
    res.json({ deleted: true, deactivated: false });
  });

  return router;
}
