import { randomBytes, randomUUID } from 'node:crypto';
import { telegramEnabled } from '../config';
import { pool } from '../db';
import { HttpError } from './http';

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

export interface TelegramLinkStatus {
  linked: boolean;
  telegramUserId: string | null;
  linkedAt: string | null;
  botConfigured: boolean;
}

export interface TelegramLinkRow {
  userId: number;
  username: string;
  displayName: string;
  telegramUserId: string;
  linkedAt: string;
}

export interface TelegramPendingCode {
  code: string;
  userId: number;
  username: string;
  displayName: string;
  expiresAt: string;
}

async function assertActiveAdmin(userId: number): Promise<{ displayName: string; username: string }> {
  const { rows } = await pool.query<{ role: string; active: boolean; display_name: string; username: string }>(
    `SELECT role, active, display_name, username FROM users WHERE id = $1`,
    [userId],
  );
  const user = rows[0];
  if (!user || !user.active || user.role !== 'admin') {
    throw new HttpError(403, 'Only active admin users can use Telegram AI');
  }
  return { displayName: user.display_name, username: user.username };
}

export async function getTelegramLinkStatusForUser(userId: number): Promise<TelegramLinkStatus> {
  const { rows } = await pool.query<{
    telegram_user_id: string;
    linked_at: Date;
  }>(
    `SELECT telegram_user_id::text AS telegram_user_id, linked_at
     FROM telegram_links WHERE user_id = $1`,
    [userId],
  );
  const row = rows[0];
  return {
    linked: Boolean(row),
    telegramUserId: row?.telegram_user_id ?? null,
    linkedAt: row?.linked_at ? row.linked_at.toISOString() : null,
    botConfigured: telegramEnabled(),
  };
}

/** All active Telegram bindings (admin overview). */
export async function listTelegramLinks(): Promise<TelegramLinkRow[]> {
  const { rows } = await pool.query<{
    user_id: number;
    username: string;
    display_name: string;
    telegram_user_id: string;
    linked_at: Date;
  }>(
    `SELECT l.user_id, u.username, u.display_name,
            l.telegram_user_id::text AS telegram_user_id, l.linked_at
     FROM telegram_links l
     JOIN users u ON u.id = l.user_id
     ORDER BY u.display_name ASC`,
  );
  return rows.map((r) => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    telegramUserId: r.telegram_user_id,
    linkedAt: r.linked_at.toISOString(),
  }));
}

/** Outstanding (non-expired) link codes for any admin account. */
export async function listPendingTelegramLinkCodes(): Promise<TelegramPendingCode[]> {
  await pool.query(`DELETE FROM telegram_link_codes WHERE expires_at < now()`);
  const { rows } = await pool.query<{
    code: string;
    user_id: number;
    username: string;
    display_name: string;
    expires_at: Date;
  }>(
    `SELECT c.code, c.user_id, u.username, u.display_name, c.expires_at
     FROM telegram_link_codes c
     JOIN users u ON u.id = c.user_id
     WHERE c.expires_at > now()
     ORDER BY c.expires_at ASC`,
  );
  return rows.map((r) => ({
    code: r.code,
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    expiresAt: r.expires_at.toISOString(),
  }));
}

/**
 * Create a one-time link code for a target admin account.
 * Other accounts' pending codes are left alone so an admin can issue several at once.
 */
export async function createTelegramLinkCode(
  targetUserId: number,
): Promise<{ code: string; expiresAt: string; userId: number; displayName: string; username: string }> {
  const target = await assertActiveAdmin(targetUserId);
  await pool.query(`DELETE FROM telegram_link_codes WHERE expires_at < now()`);
  // Replace only this account's outstanding code (one pending code per account).
  await pool.query(`DELETE FROM telegram_link_codes WHERE user_id = $1`, [targetUserId]);

  let code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await pool.query(
        `INSERT INTO telegram_link_codes (code, user_id, expires_at) VALUES ($1, $2, $3)`,
        [code, targetUserId, expiresAt.toISOString()],
      );
      return {
        code,
        expiresAt: expiresAt.toISOString(),
        userId: targetUserId,
        displayName: target.displayName,
        username: target.username,
      };
    } catch (err: unknown) {
      const codeName = (err as { code?: string }).code;
      if (codeName === '23505') {
        code = generateCode();
        continue;
      }
      throw err;
    }
  }
  throw new HttpError(500, 'Could not create a unique link code');
}

export async function cancelTelegramLinkCode(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  const result = await pool.query(`DELETE FROM telegram_link_codes WHERE code = $1`, [normalized]);
  return (result.rowCount ?? 0) > 0;
}

export interface ResolvedTelegramLink {
  userId: number;
  displayName: string;
  telegramChatId: number;
  aiChatId: string;
}

/** Resolve a linked Telegram user; returns null if not linked. Drops stale non-admin links. */
export async function resolveTelegramLink(telegramUserId: number): Promise<ResolvedTelegramLink | null> {
  const { rows } = await pool.query<{
    user_id: number;
    display_name: string;
    telegram_chat_id: string;
    ai_chat_id: string;
    role: string;
    active: boolean;
  }>(
    `SELECT l.user_id, u.display_name, l.telegram_chat_id::text AS telegram_chat_id,
            l.ai_chat_id::text AS ai_chat_id, u.role, u.active
     FROM telegram_links l
     JOIN users u ON u.id = l.user_id
     WHERE l.telegram_user_id = $1`,
    [telegramUserId],
  );
  const row = rows[0];
  if (!row) return null;
  if (!row.active || row.role !== 'admin') {
    await pool.query(`DELETE FROM telegram_links WHERE telegram_user_id = $1`, [telegramUserId]);
    return null;
  }
  return {
    userId: row.user_id,
    displayName: row.display_name,
    telegramChatId: Number(row.telegram_chat_id),
    aiChatId: row.ai_chat_id,
  };
}

export async function consumeTelegramLinkCode(input: {
  code: string;
  telegramUserId: number;
  telegramChatId: number;
}): Promise<{ displayName: string }> {
  const normalized = input.code.trim().toUpperCase();
  if (!normalized) throw new HttpError(400, 'Missing link code');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: codeRows } = await client.query<{ user_id: number }>(
      `SELECT user_id FROM telegram_link_codes
       WHERE code = $1 AND expires_at > now()
       FOR UPDATE`,
      [normalized],
    );
    const codeRow = codeRows[0];
    if (!codeRow) {
      throw new HttpError(400, 'Invalid or expired link code. Generate a new one from Reports in the web app.');
    }

    const { rows: userRows } = await client.query<{ display_name: string; role: string; active: boolean }>(
      `SELECT display_name, role, active FROM users WHERE id = $1 FOR UPDATE`,
      [codeRow.user_id],
    );
    const user = userRows[0];
    if (!user || !user.active || user.role !== 'admin') {
      throw new HttpError(403, 'Only active admin accounts can be linked');
    }

    // One Telegram account per admin user, and one admin per Telegram account.
    await client.query(`DELETE FROM telegram_links WHERE user_id = $1 OR telegram_user_id = $2`, [
      codeRow.user_id,
      input.telegramUserId,
    ]);
    await client.query(
      `INSERT INTO telegram_links (telegram_user_id, user_id, telegram_chat_id, ai_chat_id)
       VALUES ($1, $2, $3, $4)`,
      [input.telegramUserId, codeRow.user_id, input.telegramChatId, randomUUID()],
    );
    await client.query(`DELETE FROM telegram_link_codes WHERE code = $1 OR user_id = $2`, [
      normalized,
      codeRow.user_id,
    ]);
    await client.query('COMMIT');
    return { displayName: user.display_name };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function unlinkTelegramByTelegramUserId(telegramUserId: number): Promise<boolean> {
  const result = await pool.query(`DELETE FROM telegram_links WHERE telegram_user_id = $1`, [telegramUserId]);
  return (result.rowCount ?? 0) > 0;
}

export async function unlinkTelegramByUserId(userId: number): Promise<void> {
  await pool.query(`DELETE FROM telegram_links WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM telegram_link_codes WHERE user_id = $1`, [userId]);
}

export async function rotateTelegramAiChatId(telegramUserId: number): Promise<string | null> {
  const aiChatId = randomUUID();
  const result = await pool.query(
    `UPDATE telegram_links SET ai_chat_id = $2 WHERE telegram_user_id = $1
     RETURNING ai_chat_id::text AS ai_chat_id`,
    [telegramUserId, aiChatId],
  );
  return result.rows[0]?.ai_chat_id ?? null;
}
