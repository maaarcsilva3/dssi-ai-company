import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import { pool } from '../db';
import { HttpError, notFound } from '../lib/http';
import { idParam } from '../lib/validation';
import {
  assertCanAccessPayable,
  assertCanEditPayable,
  requireAnyPermission,
  type AuthUser,
} from '../lib/auth';
import { PAYABLE_LEDGER, RECEIVABLE_LEDGER, type LedgerSpec } from '../lib/ledger';

const ALLOWED: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  'image/jpeg': { ext: '.jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { ext: '.png', magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': { ext: '.webp', magic: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  'application/pdf': { ext: '.pdf', magic: (b) => b.toString('ascii', 0, 5) === '%PDF-' },
};

fs.mkdirSync(config.uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED[file.mimetype].ext}`),
  }),
  limits: { fileSize: config.maxUploadBytes, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, `Unsupported file type ${file.mimetype}. Allowed: JPEG, PNG, WEBP, PDF`));
  },
});

export async function removeStoredFiles(storedNames: string[]): Promise<void> {
  await Promise.all(
    storedNames.map((name) => fs.promises.rm(path.join(config.uploadDir, path.basename(name)), { force: true })),
  );
}

async function hasValidSignature(file: Express.Multer.File): Promise<boolean> {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    return ALLOWED[file.mimetype].magic(buf);
  } finally {
    await handle.close();
  }
}

/** Mounted under /api/payables or /api/receivables */
export function createAttachmentUploadRouter(spec: LedgerSpec) {
  const router = Router();
  router.post(
    '/:id/attachments',
    requireAnyPermission(spec.perms.create, spec.perms.edit),
    upload.array('files', 10),
    async (req, res) => {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const storedNames = files.map((f) => f.filename);
      try {
        const { id } = idParam.parse(req.params);
        if (!files.length) throw new HttpError(400, 'No files uploaded (use multipart field "files")');
        for (const f of files) {
          if (!(await hasValidSignature(f))) throw new HttpError(400, `${f.originalname} content does not match its type`);
        }
        const exists = await pool.query<{
          assigned_to: number | null;
          created_by: number | null;
          is_draft: boolean;
        }>(
          `SELECT assigned_to, created_by, COALESCE(is_draft, false) AS is_draft FROM ${spec.document} WHERE id = $1`,
          [id],
        );
        if (!exists.rowCount) throw notFound(spec.noun);
        assertCanEditPayable(
          req.user!,
          {
            assignedTo: exists.rows[0].assigned_to,
            createdBy: exists.rows[0].created_by,
            isDraft: exists.rows[0].is_draft,
          },
          spec.noun,
        );

        const inserted = [];
        for (const f of files) {
          const { rows } = await pool.query(
            `INSERT INTO attachments (${spec.parentFk}, original_name, stored_name, mime, size)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, original_name, mime, size, created_at`,
            [id, f.originalname.slice(0, 255), f.filename, f.mimetype, f.size],
          );
          inserted.push(rows[0]);
        }
        res.status(201).json(inserted);
      } catch (err) {
        await removeStoredFiles(storedNames);
        throw err;
      }
    },
  );
  return router;
}

export const payableAttachmentsRouter = createAttachmentUploadRouter(PAYABLE_LEDGER);
export const receivableAttachmentsRouter = createAttachmentUploadRouter(RECEIVABLE_LEDGER);

function canViewAttachment(user: AuthUser, row: { payable_id: number | null; receivable_id: number | null }) {
  if (user.role === 'admin') return;
  if (row.payable_id != null && !user.permissions.payables_view) throw new HttpError(403, 'Permission denied');
  if (row.receivable_id != null && !user.permissions.receivables_view) throw new HttpError(403, 'Permission denied');
}

function canEditAttachment(user: AuthUser, row: { payable_id: number | null; receivable_id: number | null }) {
  if (user.role === 'admin') return;
  if (row.payable_id != null && !user.permissions.payables_edit) throw new HttpError(403, 'Permission denied');
  if (row.receivable_id != null && !user.permissions.receivables_edit) throw new HttpError(403, 'Permission denied');
}

const ATTACHMENT_PARENT = `
  SELECT a.original_name, a.stored_name, a.mime, a.payable_id, a.receivable_id,
         COALESCE(p.assigned_to, r.assigned_to) AS assigned_to,
         COALESCE(p.created_by, r.created_by) AS created_by,
         COALESCE(p.is_draft, r.is_draft, false) AS is_draft
    FROM attachments a
    LEFT JOIN payables p ON p.id = a.payable_id
    LEFT JOIN receivables r ON r.id = a.receivable_id
   WHERE a.id = $1`;

/** Mounted under /api/attachments */
export const attachmentsRouter = Router();

attachmentsRouter.get('/:id', requireAnyPermission('payables_view', 'receivables_view'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { rows } = await pool.query(ATTACHMENT_PARENT, [id]);
  if (!rows[0]) throw notFound('Attachment');
  canViewAttachment(req.user!, rows[0]);
  const noun = rows[0].receivable_id != null ? 'Receivable' : 'Payable';
  assertCanAccessPayable(
    req.user!,
    { assignedTo: rows[0].assigned_to, createdBy: rows[0].created_by },
    noun,
  );
  const { original_name, stored_name, mime } = rows[0];
  res.setHeader('Content-Type', mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(original_name)}`);
  res.sendFile(path.join(config.uploadDir, path.basename(stored_name)), (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'File missing from storage' });
  });
});

attachmentsRouter.delete('/:id', requireAnyPermission('payables_edit', 'receivables_edit'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { rows } = await pool.query(ATTACHMENT_PARENT, [id]);
  if (!rows[0]) throw notFound('Attachment');
  canEditAttachment(req.user!, rows[0]);
  const noun = rows[0].receivable_id != null ? 'Receivable' : 'Payable';
  assertCanEditPayable(
    req.user!,
    {
      assignedTo: rows[0].assigned_to,
      createdBy: rows[0].created_by,
      isDraft: rows[0].is_draft,
    },
    noun,
  );
  await pool.query('DELETE FROM attachments WHERE id = $1', [id]);
  await removeStoredFiles([rows[0].stored_name]);
  res.json({ deleted: true });
});
