import { Router, type Request } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { config } from '../config';
import { pool, withTransaction } from '../db';
import { requireAuth, requirePermission, requireAnyPermission, isAdmin } from '../lib/auth';
import { parseArExcelBuffer } from '../lib/arExcelImport';
import { fetchSummary, recomputeSummaryTotals } from '../lib/arSummaryService';
import {
  ar2307Schema,
  arClientSchema,
  arDeductionSchema,
  arDetailSchema,
  arSummaryPatchSchema,
} from '../lib/arValidation';
import { HttpError, notFound } from '../lib/http';
import { addDays } from '../lib/releaseWindow';
import { idParam, isoDate, optionalText } from '../lib/validation';
import { buildYearPivot } from '../lib/arYearPivot';
import { removeStoredFiles } from './attachments';
import { getSettings, todayForApp } from './settings';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const BIR_2307_ALLOWED: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  'image/jpeg': { ext: '.jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': {
    ext: '.png',
    magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/webp': {
    ext: '.webp',
    magic: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
  'application/pdf': { ext: '.pdf', magic: (b) => b.toString('ascii', 0, 5) === '%PDF-' },
};

fs.mkdirSync(config.uploadDir, { recursive: true });

const upload2307 = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => {
      const meta = BIR_2307_ALLOWED[file.mimetype];
      cb(null, `${crypto.randomUUID()}${meta?.ext ?? ''}`);
    },
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (BIR_2307_ALLOWED[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, `Unsupported file type ${file.mimetype}. Allowed: JPEG, PNG, WEBP, PDF`));
  },
});

async function has2307Signature(file: Express.Multer.File): Promise<boolean> {
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    return BIR_2307_ALLOWED[file.mimetype].magic(buf);
  } finally {
    await handle.close();
  }
}

function requireArAccess(req: Request): void {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  if (isAdmin(req.user) || req.user.permissions.ar_view || req.user.permissions.ar_edit) return;
  throw new HttpError(403, 'Permission denied');
}

export const arRouter = Router();
arRouter.use(requireAuth);

arRouter.use((req, _res, next) => {
  try {
    requireArAccess(req);
    next();
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
arRouter.get('/clients', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM ar_clients ORDER BY lower(name), id`,
  );
  res.json({ items: rows });
});

arRouter.post('/clients', requireAnyPermission('ar_clients_manage', 'ar_edit'), async (req, res) => {
  const body = arClientSchema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO ar_clients (name, tin, address, contact, default_trip_classification, active)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      body.name,
      body.tin ?? null,
      body.address ?? null,
      body.contact ?? null,
      body.default_trip_classification ?? null,
      body.active ?? true,
    ],
  );
  res.status(201).json(rows[0]);
});

arRouter.put('/clients/:id', requireAnyPermission('ar_clients_manage', 'ar_edit'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = arClientSchema.parse(req.body);
  const { rows } = await pool.query(
    `UPDATE ar_clients
        SET name = $1, tin = $2, address = $3, contact = $4,
            default_trip_classification = $5, active = $6
      WHERE id = $7
      RETURNING *`,
    [
      body.name,
      body.tin ?? null,
      body.address ?? null,
      body.contact ?? null,
      body.default_trip_classification ?? null,
      body.active ?? true,
      id,
    ],
  );
  if (!rows[0]) throw notFound('AR client');
  res.json(rows[0]);
});

arRouter.delete('/clients/:id', requireAnyPermission('ar_clients_manage', 'ar_edit'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const used = await pool.query(`SELECT 1 FROM ar_summaries WHERE client_id = $1 LIMIT 1`, [id]);
  if (used.rows[0]) throw new HttpError(409, 'Client has billing summaries; deactivate instead of deleting');
  const { rowCount } = await pool.query(`DELETE FROM ar_clients WHERE id = $1`, [id]);
  if (!rowCount) throw notFound('AR client');
  res.json({ deleted: true });
});

// ---------------------------------------------------------------------------
// Details
// ---------------------------------------------------------------------------
arRouter.get('/details', async (req, res) => {
  const q = z
    .object({
      invoiceNo: optionalText,
      clientId: z.coerce.number().int().positive().optional(),
      from: isoDate.optional(),
      to: isoDate.optional(),
      dueFrom: isoDate.optional(),
      dueTo: isoDate.optional(),
      search: z.string().trim().max(200).optional(),
    })
    .parse(req.query);
  const today = await todayForApp();
  const params: unknown[] = [today];
  const where: string[] = [];
  if (q.invoiceNo) {
    params.push(q.invoiceNo);
    where.push(`lower(trim(d.invoice_no)) = lower(trim($${params.length}))`);
  }
  if (q.clientId) {
    params.push(q.clientId);
    where.push(`s.client_id = $${params.length}`);
  }
  if (q.from) {
    params.push(q.from);
    where.push(`d.entry_date >= $${params.length}`);
  }
  if (q.to) {
    params.push(q.to);
    where.push(`d.entry_date <= $${params.length}`);
  }
  if (q.search) {
    params.push(`%${q.search}%`);
    where.push(
      `(d.reference ILIKE $${params.length} OR d.origin ILIKE $${params.length} OR d.destination ILIKE $${params.length} OR d.invoice_no ILIKE $${params.length})`,
    );
  }
  if (q.dueFrom) {
    params.push(q.dueFrom);
    where.push(`s.due_date >= $${params.length}`);
  }
  if (q.dueTo) {
    params.push(q.dueTo);
    where.push(`s.due_date <= $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT d.*, c.name AS client_name, s.id AS summary_id, s.due_date AS summary_due_date,
            CASE
              WHEN COALESCE(d.receiving_date, d.billing_date) IS NULL THEN NULL
              ELSE ($1::date - COALESCE(d.receiving_date, d.billing_date))
            END AS aging_days
       FROM ar_detail_entries d
       JOIN ar_summaries s ON s.id = d.summary_id
       JOIN ar_clients c ON c.id = s.client_id
       ${whereSql}
      ORDER BY d.entry_date DESC, d.id DESC
      LIMIT 2000`,
    params,
  );
  res.json({ items: rows });
});

arRouter.post('/details', requirePermission('ar_edit'), async (req, res) => {
  const body = arDetailSchema.parse(req.body);
  const result = await withTransaction(async (db) => {
    let summaryId = body.summary_id ?? null;
    if (!summaryId) {
      const found = await db.query<{ id: number }>(
        `SELECT id FROM ar_summaries WHERE lower(trim(invoice_no)) = lower(trim($1))`,
        [body.invoice_no],
      );
      summaryId = found.rows[0]?.id ?? null;
    }
    if (!summaryId) throw new HttpError(400, 'Unknown invoice_no — import SI first or create a summary');
    const { rows } = await db.query(
      `INSERT INTO ar_detail_entries
         (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        summaryId,
        body.invoice_no,
        body.entry_date,
        body.billing_date ?? null,
        body.receiving_date ?? null,
        body.reference ?? null,
        body.origin ?? null,
        body.destination ?? null,
        body.amount,
      ],
    );
    await recomputeSummaryTotals(db, summaryId);
    return rows[0];
  });
  res.status(201).json(result);
});

arRouter.put('/details/:id', requirePermission('ar_edit'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = arDetailSchema.parse(req.body);
  const result = await withTransaction(async (db) => {
    const current = await db.query<{ summary_id: number }>(
      `SELECT summary_id FROM ar_detail_entries WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!current.rows[0]) throw notFound('AR detail');
    const { rows } = await db.query(
      `UPDATE ar_detail_entries
          SET entry_date = $1, billing_date = $2, receiving_date = $3, reference = $4, origin = $5,
              destination = $6, amount = $7, invoice_no = $8
        WHERE id = $9
        RETURNING *`,
      [
        body.entry_date,
        body.billing_date ?? null,
        body.receiving_date ?? null,
        body.reference ?? null,
        body.origin ?? null,
        body.destination ?? null,
        body.amount,
        body.invoice_no,
        id,
      ],
    );
    await recomputeSummaryTotals(db, current.rows[0].summary_id);
    return rows[0];
  });
  res.json(result);
});

arRouter.delete('/details/:id', requirePermission('ar_edit'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const result = await withTransaction(async (db) => {
    const current = await db.query<{ summary_id: number }>(
      `SELECT summary_id FROM ar_detail_entries WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!current.rows[0]) throw notFound('AR detail');
    await db.query(`DELETE FROM ar_detail_entries WHERE id = $1`, [id]);
    return recomputeSummaryTotals(db, current.rows[0].summary_id);
  });
  if (result && 'deleted' in result && result.storedName) {
    removeStoredFiles([result.storedName]);
  }
  res.json({ deleted: true, summaryRemoved: Boolean(result && 'deleted' in result) });
});

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------
arRouter.get('/summaries', async (req, res) => {
  const q = z
    .object({
      clientId: z.coerce.number().int().positive().optional(),
      month: isoDate.optional(), // any day in month
      ewtStatus: z.enum(['pending', 'submitted']).optional(),
      paymentStatus: z.enum(['unpaid', 'paid']).optional(),
      invoiceNo: optionalText,
      search: z.string().trim().max(200).optional(),
      dueFrom: isoDate.optional(),
      dueTo: isoDate.optional(),
    })
    .parse(req.query);
  const today = await todayForApp();
  const params: unknown[] = [today];
  // Monthly summary is driven by billing lines — hide orphan invoice shells.
  const where: string[] = [
    `EXISTS (SELECT 1 FROM ar_detail_entries d0 WHERE d0.summary_id = s.id)`,
  ];
  if (q.clientId) {
    params.push(q.clientId);
    where.push(`s.client_id = $${params.length}`);
  }
  if (q.month) {
    // Match the month shown in the UI (Coverage column): prefer coverage_start over invoice_date.
    const start = `${q.month.slice(0, 7)}-01`;
    params.push(start);
    where.push(
      `(date_trunc('month', COALESCE(s.coverage_start, s.invoice_date))::date = $${params.length}::date)`,
    );
  }
  if (q.ewtStatus) {
    params.push(q.ewtStatus);
    where.push(`s.ewt_2307_status = $${params.length}`);
  }
  if (q.paymentStatus) {
    params.push(q.paymentStatus);
    where.push(`s.payment_status = $${params.length}`);
  }
  if (q.invoiceNo) {
    params.push(q.invoiceNo);
    where.push(`lower(trim(s.invoice_no)) = lower(trim($${params.length}))`);
  }
  if (q.search) {
    params.push(`%${q.search}%`);
    where.push(`s.invoice_no ILIKE $${params.length}`);
  }
  if (q.dueFrom) {
    params.push(q.dueFrom);
    where.push(`s.due_date >= $${params.length}`);
  }
  if (q.dueTo) {
    params.push(q.dueTo);
    where.push(`s.due_date <= $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  // Aging starts from earliest detail receiving_date when any exist; else invoice/billing date.
  const { rows } = await pool.query(
    `SELECT s.*,
            c.name AS client_name,
            (SELECT count(*)::int FROM ar_detail_entries d WHERE d.summary_id = s.id) AS detail_count,
            aging.aging_start_date,
            CASE
              WHEN aging.aging_start_date IS NULL THEN NULL
              ELSE ($1::date - aging.aging_start_date)
            END AS aging_days,
            CASE
              WHEN s.due_date IS NULL THEN NULL
              ELSE ($1::date - s.due_date)
            END AS days_past_due
       FROM ar_summaries s
       JOIN ar_clients c ON c.id = s.client_id
       CROSS JOIN LATERAL (
         SELECT COALESCE(
                  (SELECT MIN(d.receiving_date)
                     FROM ar_detail_entries d
                    WHERE d.summary_id = s.id AND d.receiving_date IS NOT NULL),
                  s.invoice_date
                ) AS aging_start_date
       ) aging
       ${whereSql}
      ORDER BY COALESCE(s.coverage_start, s.invoice_date) DESC NULLS LAST, s.id DESC
      LIMIT 500`,
    params,
  );
  res.json({ items: rows });
});

arRouter.get('/summaries/year-pivot', async (req, res) => {
  const { year } = z
    .object({
      year: z.coerce.number().int().min(2000).max(2100),
    })
    .parse(req.query);

  const { rows } = await pool.query<{
    company: string;
    month_num: number;
    total: string;
  }>(
    `SELECT c.name AS company,
            EXTRACT(MONTH FROM date_trunc('month', COALESCE(s.coverage_start, s.invoice_date))::date)::int
              AS month_num,
            SUM(s.grand_total::numeric) AS total
       FROM ar_summaries s
       JOIN ar_clients c ON c.id = s.client_id
      WHERE EXISTS (SELECT 1 FROM ar_detail_entries d0 WHERE d0.summary_id = s.id)
        AND EXTRACT(YEAR FROM COALESCE(s.coverage_start, s.invoice_date)::date) = $1
      GROUP BY c.id, c.name, month_num
      ORDER BY lower(c.name), month_num`,
    [year],
  );

  const aggregates = rows.map((r) => ({
    company: r.company,
    monthNum: r.month_num,
    total: Number(r.total),
  }));

  res.json(buildYearPivot(year, aggregates));
});

arRouter.get('/summaries/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await fetchSummary(id));
});

arRouter.patch('/summaries/:id', requirePermission('ar_edit'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = arSummaryPatchSchema.parse(req.body);
  const existing = await pool.query<{
    payment_status: string;
    acknowledgment_receipt_no: string | null;
    invoice_date: string | null;
    due_date: string | null;
  }>(
    `SELECT payment_status, acknowledgment_receipt_no, invoice_date, due_date
       FROM ar_summaries WHERE id = $1`,
    [id],
  );
  if (!existing.rows[0]) throw notFound('AR summary');
  const cur = existing.rows[0];

  const nextStatus = body.payment_status ?? cur.payment_status;
  const nextReceipt =
    body.acknowledgment_receipt_no !== undefined
      ? body.acknowledgment_receipt_no?.trim() || null
      : cur.acknowledgment_receipt_no;
  if (nextStatus === 'paid' && !nextReceipt) {
    throw new HttpError(400, 'Validation failed', {
      fieldErrors: {
        acknowledgment_receipt_no: ['Acknowledgment receipt number is required when status is paid'],
      },
    });
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };
  if (body.trip_classification !== undefined) add('trip_classification', body.trip_classification);
  if (body.trip_type !== undefined) add('trip_type', body.trip_type);
  if (body.fleet_type !== undefined) add('fleet_type', body.fleet_type);
  if (body.service_type !== undefined) add('service_type', body.service_type);
  if (body.billing_reference !== undefined) add('billing_reference', body.billing_reference);
  if (body.coverage_start !== undefined) add('coverage_start', body.coverage_start);
  if (body.coverage_end !== undefined) add('coverage_end', body.coverage_end);
  if (body.invoice_date !== undefined) add('invoice_date', body.invoice_date);
  if (body.client_id !== undefined) add('client_id', body.client_id);
  if (body.payment_status !== undefined) add('payment_status', body.payment_status);
  if (body.due_date !== undefined) add('due_date', body.due_date);
  if (body.acknowledgment_receipt_no !== undefined) {
    add('acknowledgment_receipt_no', nextReceipt);
  }
  if (body.payment_status === 'unpaid' && body.acknowledgment_receipt_no === undefined) {
    // keep existing receipt number when reverting to unpaid unless cleared explicitly
  }
  if (!sets.length) {
    res.json(await fetchSummary(id));
    return;
  }
  params.push(id);
  const { rowCount } = await pool.query(
    `UPDATE ar_summaries SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params,
  );
  if (!rowCount) throw notFound('AR summary');
  res.json(await fetchSummary(id));
});

/** Submit BIR 2307 with required file (multipart: file, ewt_2307_submitted_at). */
arRouter.post(
  '/summaries/:id/2307',
  requirePermission('ar_edit'),
  upload2307.single('file'),
  async (req, res) => {
    const { id } = idParam.parse(req.params);
    const file = req.file;
    const storedNames = file ? [file.filename] : [];
    try {
      if (!file) throw new HttpError(400, 'BIR 2307 file is required');
      if (!(await has2307Signature(file))) {
        throw new HttpError(400, `${file.originalname} content does not match its type`);
      }
      const body = ar2307Schema.parse({
        ewt_2307_status: 'submitted',
        ewt_2307_submitted_at: req.body?.ewt_2307_submitted_at,
      });
      const existing = await pool.query<{ ewt_2307_stored_name: string | null }>(
        `SELECT ewt_2307_stored_name FROM ar_summaries WHERE id = $1`,
        [id],
      );
      if (!existing.rows[0]) throw notFound('AR summary');
      const prev = existing.rows[0].ewt_2307_stored_name;

      const { rowCount } = await pool.query(
        `UPDATE ar_summaries
            SET ewt_2307_status = $1,
                ewt_2307_submitted_at = $2,
                ewt_2307_original_name = $3,
                ewt_2307_stored_name = $4,
                ewt_2307_mime = $5,
                ewt_2307_size = $6
          WHERE id = $7`,
        [
          body.ewt_2307_status,
          body.ewt_2307_submitted_at,
          file.originalname.slice(0, 255),
          file.filename,
          file.mimetype,
          file.size,
          id,
        ],
      );
      if (!rowCount) throw notFound('AR summary');
      if (prev && prev !== file.filename) await removeStoredFiles([prev]);
      res.json(await fetchSummary(id));
    } catch (err) {
      await removeStoredFiles(storedNames);
      throw err;
    }
  },
);

/** Revert 2307 to pending (clears file). JSON body only. */
arRouter.patch('/summaries/:id/2307', requirePermission('ar_edit'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = ar2307Schema.parse(req.body);
  if (body.ewt_2307_status === 'submitted') {
    throw new HttpError(400, 'Use multipart POST /2307 with a file to submit BIR 2307');
  }
  const existing = await pool.query<{ ewt_2307_stored_name: string | null }>(
    `SELECT ewt_2307_stored_name FROM ar_summaries WHERE id = $1`,
    [id],
  );
  if (!existing.rows[0]) throw notFound('AR summary');
  const prev = existing.rows[0].ewt_2307_stored_name;

  const { rowCount } = await pool.query(
    `UPDATE ar_summaries
        SET ewt_2307_status = 'pending',
            ewt_2307_submitted_at = NULL,
            ewt_2307_original_name = NULL,
            ewt_2307_stored_name = NULL,
            ewt_2307_mime = NULL,
            ewt_2307_size = NULL
      WHERE id = $1`,
    [id],
  );
  if (!rowCount) throw notFound('AR summary');
  if (prev) await removeStoredFiles([prev]);
  res.json(await fetchSummary(id));
});

arRouter.get('/summaries/:id/2307/file', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { rows } = await pool.query<{
    ewt_2307_stored_name: string | null;
    ewt_2307_original_name: string | null;
    ewt_2307_mime: string | null;
  }>(
    `SELECT ewt_2307_stored_name, ewt_2307_original_name, ewt_2307_mime
       FROM ar_summaries WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) throw notFound('AR summary');
  if (!row.ewt_2307_stored_name) throw notFound('BIR 2307 file');
  const filePath = path.join(config.uploadDir, path.basename(row.ewt_2307_stored_name));
  if (!fs.existsSync(filePath)) throw notFound('BIR 2307 file');
  res.setHeader('Content-Type', row.ewt_2307_mime || 'application/octet-stream');
  if (row.ewt_2307_original_name) {
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${row.ewt_2307_original_name.replace(/"/g, '')}"`,
    );
  }
  res.sendFile(filePath);
});

// ---------------------------------------------------------------------------
// Deductions
// ---------------------------------------------------------------------------
arRouter.post('/summaries/:id/deductions', requirePermission('ar_edit'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = arDeductionSchema.parse(req.body);
  const result = await withTransaction(async (db) => {
    const exists = await db.query(`SELECT id FROM ar_summaries WHERE id = $1 FOR UPDATE`, [id]);
    if (!exists.rows[0]) throw notFound('AR summary');
    const { rows } = await db.query(
      `INSERT INTO ar_deductions (summary_id, description, amount)
       VALUES ($1,$2,$3) RETURNING *`,
      [id, body.description, body.amount],
    );
    await recomputeSummaryTotals(db, id);
    return rows[0];
  });
  res.status(201).json(result);
});

arRouter.delete('/summaries/:id/deductions/:deductionId', requirePermission('ar_edit'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const deductionId = Number(req.params.deductionId);
  if (!Number.isInteger(deductionId) || deductionId <= 0) throw new HttpError(400, 'Invalid deduction id');
  await withTransaction(async (db) => {
    const del = await db.query(
      `DELETE FROM ar_deductions WHERE id = $1 AND summary_id = $2`,
      [deductionId, id],
    );
    if (!del.rowCount) throw notFound('Deduction');
    await recomputeSummaryTotals(db, id);
  });
  res.json({ deleted: true });
});

// ---------------------------------------------------------------------------
// Excel import
// ---------------------------------------------------------------------------
arRouter.post('/import', requirePermission('ar_edit'), upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file?.buffer?.length) throw new HttpError(400, 'Upload an Excel file in multipart field "file"');
  const parsed = parseArExcelBuffer(file.buffer, { fileName: file.originalname });

  const result = await withTransaction(async (db) => {
    // Upsert client by name
    let client = await db.query<{ id: number; default_trip_classification: string | null }>(
      `SELECT id, default_trip_classification FROM ar_clients WHERE lower(trim(name)) = lower(trim($1))`,
      [parsed.clientName],
    );
    let clientId = client.rows[0]?.id;
    if (!clientId) {
      const created = await db.query<{ id: number }>(
        `INSERT INTO ar_clients (name, tin, address)
         VALUES ($1,$2,$3) RETURNING id`,
        [parsed.clientName, parsed.clientTin, parsed.clientAddress],
      );
      clientId = created.rows[0]!.id;
    } else {
      await db.query(
        `UPDATE ar_clients SET tin = COALESCE($2, tin), address = COALESCE($3, address) WHERE id = $1`,
        [clientId, parsed.clientTin, parsed.clientAddress],
      );
      client = await db.query(`SELECT id, default_trip_classification FROM ar_clients WHERE id = $1`, [clientId]);
    }

    const tripClassification =
      parsed.tripClassification ?? client.rows[0]?.default_trip_classification ?? null;

    const settings = await getSettings(db);
    const dueDate =
      parsed.invoiceDate != null ? addDays(parsed.invoiceDate, settings.ar_due_days) : null;

    const existing = await db.query<{ id: number }>(
      `SELECT id FROM ar_summaries WHERE lower(trim(invoice_no)) = lower(trim($1)) FOR UPDATE`,
      [parsed.invoiceNo],
    );

    let summaryId: number;
    if (existing.rows[0]) {
      summaryId = existing.rows[0].id;
      await db.query(
        `UPDATE ar_summaries SET
           client_id = $2,
           billing_reference = $3,
           trip_type = $4,
           trip_classification = COALESCE($5, trip_classification),
           fleet_type = $6,
           service_type = $7,
           coverage_start = $8,
           coverage_end = $9,
           invoice_date = $10,
           due_date = COALESCE($11, due_date)
         WHERE id = $1`,
        [
          summaryId,
          clientId,
          parsed.billingReference,
          parsed.tripType,
          tripClassification,
          parsed.fleetType,
          parsed.serviceType,
          parsed.coverageStart,
          parsed.coverageEnd,
          parsed.invoiceDate,
          dueDate,
        ],
      );
      await db.query(`DELETE FROM ar_detail_entries WHERE summary_id = $1`, [summaryId]);
    } else {
      const inserted = await db.query<{ id: number }>(
        `INSERT INTO ar_summaries
           (invoice_no, client_id, billing_reference, trip_type, trip_classification,
            fleet_type, service_type, coverage_start, coverage_end, invoice_date, due_date, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          parsed.invoiceNo,
          clientId,
          parsed.billingReference,
          parsed.tripType,
          tripClassification,
          parsed.fleetType,
          parsed.serviceType,
          parsed.coverageStart,
          parsed.coverageEnd,
          parsed.invoiceDate,
          dueDate,
          req.user!.id,
        ],
      );
      summaryId = inserted.rows[0]!.id;
    }

    for (const line of parsed.details) {
      await db.query(
        `INSERT INTO ar_detail_entries
           (summary_id, invoice_no, entry_date, billing_date, reference, origin, destination, amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          summaryId,
          parsed.invoiceNo,
          line.entry_date,
          line.billing_date ?? parsed.invoiceDate,
          line.reference?.trim() || 'N/A',
          line.origin?.trim() || 'N/A',
          line.destination?.trim() || 'N/A',
          line.amount,
        ],
      );
    }

    const totals = await recomputeSummaryTotals(db, summaryId);
    if (!totals || 'deleted' in totals) {
      throw new HttpError(400, 'Import produced no billing lines');
    }
    return { summaryId, totals, detailCount: parsed.details.length, siVatInc: parsed.siVatInc };
  });

  const summary = await fetchSummary(result.summaryId);
  res.status(201).json({
    ...result,
    summary,
    parser: 'ar-excel-v2',
    warning:
      result.siVatInc != null &&
      Math.abs(Number(result.totals.total_sales_vatinc) - result.siVatInc) > 0.05
        ? `SI VAT-inc (${result.siVatInc}) differs from detail sum (${result.totals.total_sales_vatinc})`
        : null,
  });
});
