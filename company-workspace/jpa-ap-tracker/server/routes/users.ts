import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../db';
import { HttpError, notFound } from '../lib/http';
import { requireAdmin, requireAuth } from '../lib/auth';
import { EMPTY_PERMISSIONS, PERMISSION_KEYS, permissionsFromRow } from '../lib/permissions';
import {
  listAllowedPayableStatusIds,
  listDefaultPayableStatusIds,
  replacePayableDefaultStatuses,
  replacePayableStatusPermissions,
} from '../lib/payableStatusAccess';
import { idParam, userCreateSchema, userUpdateSchema } from '../lib/validation';

const USER_SELECT = `
  SELECT u.id, u.username, u.display_name, u.role, u.active, u.created_at, u.updated_at,
         p.*
    FROM users u
    LEFT JOIN user_permissions p ON p.user_id = u.id`;

function shapeUser(
  row: Record<string, unknown>,
  payableStatusIds: number[] = [],
  payableDefaultStatusIds: number[] = [],
) {
  const permissions = row.role === 'admin' ? { ...EMPTY_PERMISSIONS, ...Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) } : permissionsFromRow(row as never);
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    permissions,
    payable_status_ids: row.role === 'admin' ? [] : payableStatusIds,
    payable_default_status_ids: row.role === 'admin' ? [] : payableDefaultStatusIds,
  };
}

async function shapeUserById(db: { query: typeof pool.query }, id: number) {
  const full = await db.query(`${USER_SELECT} WHERE u.id = $1`, [id]);
  if (!full.rows[0]) return null;
  const statusIds = await listAllowedPayableStatusIds(db, id);
  const defaultIds = await listDefaultPayableStatusIds(db, id);
  return shapeUser(full.rows[0], statusIds, defaultIds);
}

async function upsertPermissions(db: { query: typeof pool.query }, userId: number, role: string, perms: Record<string, boolean> | undefined) {
  if (role === 'admin') {
    await db.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);
    return;
  }
  const p = { ...EMPTY_PERMISSIONS, ...perms };
  const cols = PERMISSION_KEYS.join(', ');
  const placeholders = PERMISSION_KEYS.map((_, i) => `$${i + 2}`).join(', ');
  const updates = PERMISSION_KEYS.map((k) => `${k} = EXCLUDED.${k}`).join(', ');
  await db.query(
    `INSERT INTO user_permissions (user_id, ${cols})
     VALUES ($1, ${placeholders})
     ON CONFLICT (user_id) DO UPDATE SET ${updates}`,
    [userId, ...PERMISSION_KEYS.map((k) => p[k])],
  );
}

export const usersRouter = Router();

/** Active staff list for assignee dropdowns (any authenticated user who can manage payables). */
usersRouter.get('/assignees', requireAuth, async (_req, res) => {
  const { rows } = await pool.query<{
    id: number;
    username: string;
    display_name: string;
  }>(
    `SELECT id, username, display_name
       FROM users
      WHERE active AND role = 'staff'
      ORDER BY lower(display_name), id`,
  );
  const out = [];
  for (const r of rows) {
    const defaultIds = await listDefaultPayableStatusIds(pool, r.id);
    out.push({ ...r, default_payable_status_ids: defaultIds });
  }
  res.json(out);
});

usersRouter.use(requireAdmin);

usersRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`${USER_SELECT} ORDER BY u.role, lower(u.display_name), u.id`);
  const out = [];
  for (const r of rows) {
    const statusIds = await listAllowedPayableStatusIds(pool, r.id as number);
    const defaultIds = await listDefaultPayableStatusIds(pool, r.id as number);
    out.push(shapeUser(r, statusIds, defaultIds));
  }
  res.json(out);
});

usersRouter.get('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const user = await shapeUserById(pool, id);
  if (!user) throw notFound('User');
  res.json(user);
});

usersRouter.post('/', async (req, res) => {
  const body = userCreateSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO users (username, display_name, password_hash, role, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [body.username, body.display_name, passwordHash, body.role, body.active],
    );
    const id = rows[0].id as number;
    await upsertPermissions(db, id, body.role, body.permissions);
    if (body.role !== 'admin') {
      await replacePayableStatusPermissions(db, id, body.payable_status_ids ?? []);
      await replacePayableDefaultStatuses(db, id, body.payable_default_status_ids ?? []);
    }
    return shapeUserById(db, id);
  });
  res.status(201).json(user);
});

usersRouter.put('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = userUpdateSchema.parse(req.body);

  const user = await withTransaction(async (db) => {
    const current = await db.query<{ id: number; role: string }>('SELECT id, role FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (!current.rows[0]) throw notFound('User');

    const nextRole = body.role ?? current.rows[0].role;
    if (current.rows[0].role === 'admin' && nextRole !== 'admin') {
      const admins = await db.query(`SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND active AND id <> $1`, [id]);
      if (admins.rows[0].n < 1) throw new HttpError(400, 'Cannot demote the last active admin');
    }
    if (body.active === false && current.rows[0].role === 'admin') {
      const admins = await db.query(`SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND active AND id <> $1`, [id]);
      if (admins.rows[0].n < 1) throw new HttpError(400, 'Cannot deactivate the last active admin');
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    const add = (col: string, value: unknown) => {
      params.push(value);
      sets.push(`${col} = $${params.length}`);
    };
    if (body.username !== undefined) add('username', body.username);
    if (body.display_name !== undefined) add('display_name', body.display_name);
    if (body.role !== undefined) add('role', body.role);
    if (body.active !== undefined) add('active', body.active);
    if (body.password) add('password_hash', await bcrypt.hash(body.password, 10));

    if (sets.length) {
      params.push(id);
      await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
    }

    if (body.permissions !== undefined || body.role !== undefined) {
      await upsertPermissions(db, id, nextRole, body.permissions);
    }
    if (body.payable_status_ids !== undefined || body.role !== undefined) {
      if (nextRole === 'admin') {
        await replacePayableStatusPermissions(db, id, []);
      } else if (body.payable_status_ids !== undefined) {
        await replacePayableStatusPermissions(db, id, body.payable_status_ids);
      }
    }
    if (body.payable_default_status_ids !== undefined || body.role !== undefined) {
      if (nextRole === 'admin') {
        await replacePayableDefaultStatuses(db, id, []);
      } else if (body.payable_default_status_ids !== undefined) {
        await replacePayableDefaultStatuses(db, id, body.payable_default_status_ids);
      }
    }

    return shapeUserById(db, id);
  });
  res.json(user);
});

usersRouter.delete('/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  if (req.user?.id === id) throw new HttpError(400, 'Cannot delete your own account');

  await withTransaction(async (db) => {
    const { rows } = await db.query<{ role: string }>('SELECT role FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) throw notFound('User');
    if (rows[0].role === 'admin') {
      const admins = await db.query(`SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND active AND id <> $1`, [id]);
      if (admins.rows[0].n < 1) throw new HttpError(400, 'Cannot delete the last active admin');
    }
    await db.query('UPDATE payables SET assigned_to = NULL WHERE assigned_to = $1', [id]);
    await db.query('UPDATE receivables SET assigned_to = NULL WHERE assigned_to = $1', [id]);
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [id]);
    if (!rowCount) throw notFound('User');
  });
  res.json({ deleted: true });
});
