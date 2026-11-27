import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import { pool } from '../db';
import { HttpError } from './http';

const ALLOWED: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  'image/jpeg': {
    ext: '.jpg',
    magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  'image/png': {
    ext: '.png',
    magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    ext: '.webp',
    magic: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
  'application/pdf': {
    ext: '.pdf',
    magic: (b) => b.toString('ascii', 0, 5) === '%PDF-',
  },
};

function sniffMime(buf: Buffer, hinted?: string | null): string | null {
  if (hinted && ALLOWED[hinted]?.magic(buf)) return hinted;
  for (const [mime, spec] of Object.entries(ALLOWED)) {
    if (spec.magic(buf)) return mime;
  }
  return null;
}

/** Save a payable attachment from an in-memory buffer (AI / Telegram uploads). */
export async function savePayableAttachmentFromBuffer(opts: {
  payableId: number;
  buffer: Buffer;
  originalName: string;
  mimeHint?: string | null;
}): Promise<{ id: number; original_name: string }> {
  if (opts.buffer.length > config.maxUploadBytes) {
    throw new HttpError(400, `File too large (max ${Math.round(config.maxUploadBytes / (1024 * 1024))} MB)`);
  }
  const mime = sniffMime(opts.buffer, opts.mimeHint ?? null);
  if (!mime) {
    throw new HttpError(400, 'Unsupported file type. Allowed: JPEG, PNG, WEBP, PDF');
  }
  const exists = await pool.query(`SELECT id FROM payables WHERE id = $1`, [opts.payableId]);
  if (!exists.rowCount) throw new HttpError(404, 'Payable not found');

  fs.mkdirSync(config.uploadDir, { recursive: true });
  const filename = `${crypto.randomUUID()}${ALLOWED[mime]!.ext}`;
  const dest = path.join(config.uploadDir, filename);
  await fs.promises.writeFile(dest, opts.buffer);
  try {
    const { rows } = await pool.query<{ id: number; original_name: string }>(
      `INSERT INTO attachments (payable_id, original_name, stored_name, mime, size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, original_name`,
      [opts.payableId, opts.originalName.slice(0, 255), filename, mime, opts.buffer.length],
    );
    return rows[0]!;
  } catch (err) {
    await fs.promises.rm(dest, { force: true });
    throw err;
  }
}

export async function countPayableAttachments(payableId: number): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM attachments WHERE payable_id = $1`,
    [payableId],
  );
  return rows[0]?.n ?? 0;
}
