import { Router } from 'express';
import { pool, type Queryable } from '../db';
import { settingsSchema } from '../lib/validation';
import { todayInTimezone } from '../lib/releaseWindow';

export interface Settings {
  release_weekday: number;
  days_before: number;
  days_after: number;
  include_overdue: boolean;
  timezone: string;
  ar_due_days: number;
}

const COLUMNS = 'release_weekday, days_before, days_after, include_overdue, timezone, ar_due_days';

export async function getSettings(db: Queryable = pool): Promise<Settings> {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM settings WHERE id = 1`);
  return rows[0];
}

export async function todayForApp(db: Queryable = pool): Promise<string> {
  const { timezone } = await getSettings(db);
  return todayInTimezone(timezone);
}

export const settingsRouter = Router();

settingsRouter.get('/', async (_req, res) => {
  const settings = await getSettings();
  res.json({ ...settings, today: todayInTimezone(settings.timezone) });
});

settingsRouter.put('/', async (req, res) => {
  const s = settingsSchema.parse(req.body);
  const { rows } = await pool.query(
    `UPDATE settings
        SET release_weekday = $1, days_before = $2, days_after = $3, include_overdue = $4, timezone = $5,
            ar_due_days = $6
      WHERE id = 1
      RETURNING ${COLUMNS}`,
    [s.release_weekday, s.days_before, s.days_after, s.include_overdue, s.timezone, s.ar_due_days],
  );
  res.json({ ...rows[0], today: todayInTimezone(rows[0].timezone) });
});
