import type { Queryable } from '../db';
import { pool } from '../db';

export async function createNotification(
  db: Queryable | typeof pool,
  opts: {
    userId: number;
    type: string;
    title: string;
    body?: string | null;
    link?: string | null;
  },
) {
  if (!opts.userId) return;
  await db.query(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES ($1, $2, $3, $4, $5)`,
    [opts.userId, opts.type, opts.title, opts.body ?? null, opts.link ?? null],
  );
}

export async function notifyAssignee(opts: {
  assigneeId: number | null | undefined;
  actorId: number;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  db?: Queryable;
}) {
  if (!opts.assigneeId || opts.assigneeId === opts.actorId) return;
  await createNotification(opts.db ?? pool, {
    userId: opts.assigneeId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    link: opts.link,
  });
}
