import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db';
import { HttpError } from '../lib/http';
import { loadAuthUser, requireAuth } from '../lib/auth';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

authRouter.post('/login', async (req, res) => {
  const body = loginSchema.parse(req.body);
  const { rows } = await pool.query(
    `SELECT id, password_hash, active FROM users WHERE lower(username) = lower($1)`,
    [body.username],
  );
  const user = rows[0];
  if (!user || !user.active) throw new HttpError(401, 'Invalid username or password');

  const ok = await bcrypt.compare(body.password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Invalid username or password');

  req.session.userId = user.id;
  const authUser = await loadAuthUser(user.id);
  if (!authUser) throw new HttpError(401, 'Invalid username or password');
  res.json(authUser);
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to log out' });
      return;
    }
    res.clearCookie('ap.sid');
    res.json({ ok: true });
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});
