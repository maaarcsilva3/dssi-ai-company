import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requireAuth } from '../lib/auth';
import { idParam } from '../lib/validation';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 30), 100);
  const { rows } = await pool.query(
    `SELECT id, type, title, body, link, read_at, created_at
       FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2`,
    [req.user!.id, limit],
  );
  const unread = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [req.user!.id],
  );
  res.json({ items: rows, unreadCount: unread.rows[0]?.n ?? 0 });
});

notificationsRouter.post('/:id/read', async (req, res) => {
  const { id } = idParam.parse(req.params);
  await pool.query(
    `UPDATE notifications SET read_at = now()
      WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [id, req.user!.id],
  );
  res.json({ ok: true });
});

notificationsRouter.post('/read-all', async (req, res) => {
  await pool.query(
    `UPDATE notifications SET read_at = now()
      WHERE user_id = $1 AND read_at IS NULL`,
    [req.user!.id],
  );
  res.json({ ok: true });
});

const idsSchema = z.object({ ids: z.array(z.coerce.number().int().positive()).min(1).max(100) });

notificationsRouter.post('/read-many', async (req, res) => {
  const { ids } = idsSchema.parse(req.body);
  await pool.query(
    `UPDATE notifications SET read_at = now()
      WHERE user_id = $1 AND id = ANY($2::int[]) AND read_at IS NULL`,
    [req.user!.id, ids],
  );
  res.json({ ok: true });
});
