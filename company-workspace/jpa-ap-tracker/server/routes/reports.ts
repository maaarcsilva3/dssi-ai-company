import { Router } from 'express';
import fs from 'node:fs';
import multer from 'multer';
import { z } from 'zod';
import { pool } from '../db';
import { requireAdmin, requireAuth } from '../lib/auth';
import {
  AiActionClarifyError,
  attachFileToPendingAiAction,
  confirmationPrompt,
} from '../lib/aiPayableActions';
import { runReportAsk } from '../lib/runReportAsk';
import {
  cancelTelegramLinkCode,
  createTelegramLinkCode,
  getTelegramLinkStatusForUser,
  listPendingTelegramLinkCodes,
  listTelegramLinks,
  unlinkTelegramByUserId,
} from '../lib/telegramLink';
import { config, telegramEnabled } from '../config';
import { HttpError } from '../lib/http';
import { isValidIsoDate } from '../lib/releaseWindow';
import { resolveReportPeriod, type ReportPeriodKind } from '../lib/reportPeriod';
import { getSettings, todayForApp } from './settings';

const askUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireAdmin);

const querySchema = z.object({
  period: z.enum(['week', 'month', 'year']).default('month'),
  anchor: z
    .string()
    .optional()
    .refine((v) => v === undefined || isValidIsoDate(v), 'Invalid anchor date'),
  ledger: z.enum(['payables', 'receivables']).optional().default('payables'),
});

/** Swap payable tables for receivable tables. Identifiers are a fixed pair, never request text. */
function applyLedger(sql: string, ledger: 'payables' | 'receivables') {
  if (ledger === 'payables') return sql;
  return sql
    .replaceAll('payable_status_history', 'receivable_status_history')
    .replaceAll('payable_invoices', 'receivable_invoices')
    .replaceAll('payable_statuses', 'receivable_statuses')
    .replaceAll('payable_id', 'receivable_id')
    .replaceAll('payables', 'receivables')
    .replaceAll('clients', 'customers');
}

type NamedTotal = { name: string; count: number; amount: string };

async function namedTotals(
  sql: string,
  params: unknown[],
): Promise<NamedTotal[]> {
  const { rows } = await pool.query(sql, params);
  return rows.map((r) => ({
    name: r.name as string,
    count: Number(r.count),
    amount: String(r.amount),
  }));
}

reportsRouter.get('/', async (req, res) => {
  const q = querySchema.parse(req.query);
  const ledger = q.ledger;
  const query = (sql: string, params?: unknown[]) => pool.query(applyLedger(sql, ledger), params);
  const named = (sql: string, params: unknown[]) => namedTotals(applyLedger(sql, ledger), params);
  const today = await todayForApp();
  const settings = await getSettings();
  const period = resolveReportPeriod(q.period as ReportPeriodKind, q.anchor ?? today);
  const { start, end } = period;
  const range: [string, string] = [start, end];

  const paidWhere = `COALESCE(p.is_draft, false) = false AND s.category = 'paid' AND p.paid_at >= $1 AND p.paid_at <= $2`;
  const dueWhere = `COALESCE(p.is_draft, false) = false AND s.category <> 'cancelled' AND p.due_date >= $1 AND p.due_date <= $2`;

  const [
    paidSummary,
    dueSummary,
    paidByClient,
    paidByType,
    paidByMethod,
    dueByClient,
    dueByType,
    dueByMethod,
    vatEwt,
    agingRows,
    assignees,
    timingRows,
    historyRows,
    invoiceRows,
  ] = await Promise.all([
    query(
      `SELECT count(*)::int AS count,
              COALESCE(sum(p.amount), 0)::text AS amount,
              COALESCE(sum(p.gross_amount), 0)::text AS gross_amount,
              COALESCE(sum(p.vat_amount), 0)::text AS vat_amount,
              COALESCE(sum(p.ewt_amount), 0)::text AS ewt_amount
         FROM payables p
         JOIN payable_statuses s ON s.id = p.status_id
        WHERE ${paidWhere}`,
      range,
    ),
    query(
      `SELECT count(*)::int AS count,
              COALESCE(sum(p.amount), 0)::text AS amount,
              count(*) FILTER (WHERE s.category = 'open')::int AS open_count,
              COALESCE(sum(p.amount) FILTER (WHERE s.category = 'open'), 0)::text AS open_amount,
              count(*) FILTER (WHERE s.category = 'paid')::int AS paid_count,
              COALESCE(sum(p.amount) FILTER (WHERE s.category = 'paid'), 0)::text AS paid_amount
         FROM payables p
         JOIN payable_statuses s ON s.id = p.status_id
        WHERE ${dueWhere}`,
      range,
    ),
    named(
      `SELECT c.name AS name, count(*)::int AS count, COALESCE(sum(p.amount), 0)::text AS amount
         FROM payables p
         JOIN payable_statuses s ON s.id = p.status_id
         JOIN clients c ON c.id = p.client_id
        WHERE ${paidWhere}
        GROUP BY c.id, c.name
        ORDER BY sum(p.amount) DESC, lower(c.name)`,
      range,
    ),
    named(
      `SELECT t.name AS name, count(*)::int AS count, COALESCE(sum(p.amount), 0)::text AS amount
         FROM payables p
         JOIN payable_statuses s ON s.id = p.status_id
         JOIN payment_types t ON t.id = p.payment_type_id
        WHERE ${paidWhere}
        GROUP BY t.id, t.name
        ORDER BY sum(p.amount) DESC, lower(t.name)`,
      range,
    ),
    named(
      `SELECT m.name AS name, count(*)::int AS count, COALESCE(sum(p.amount), 0)::text AS amount
         FROM payables p
         JOIN payable_statuses s ON s.id = p.status_id
         JOIN payment_methods m ON m.id = p.payment_method_id
        WHERE ${paidWhere}
        GROUP BY m.id, m.name
        ORDER BY sum(p.amount) DESC, lower(m.name)`,
      range,
    ),
    named(
      `SELECT c.name AS name, count(*)::int AS count, COALESCE(sum(p.amount), 0)::text AS amount
         FROM payables p
         JOIN payable_statuses s ON s.id = p.status_id
         JOIN clients c ON c.id = p.client_id
        WHERE ${dueWhere}
        GROUP BY c.id, c.name
        ORDER BY sum(p.amount) DESC, lower(c.name)`,
      range,
    ),
    named(
      `SELECT t.name AS name, count(*)::int AS count, COALESCE(sum(p.amount), 0)::text AS amount
         FROM payables p
         JOIN payable_statuses s ON s.id = p.status_id
         JOIN payment_types t ON t.id = p.payment_type_id
        WHERE ${dueWhere}
        GROUP BY t.id, t.name
        ORDER BY sum(p.amount) DESC, lower(t.name)`,
      range,
    ),
    named(
      `SELECT m.name AS name, count(*)::int AS count, COALESCE(sum(p.amount), 0)::text AS amount
         FROM payables p
         JOIN payable_statuses s ON s.id = p.status_id
         JOIN payment_methods m ON m.id = p.payment_method_id
        WHERE ${dueWhere}
        GROUP BY m.id, m.name
        ORDER BY sum(p.amount) DESC, lower(m.name)`,
      range,
    ),
    query(
      `SELECT COALESCE(sum(p.gross_amount), 0)::text AS gross_amount,
              COALESCE(sum(p.vat_amount), 0)::text AS vat_amount,
              COALESCE(sum(p.ewt_amount) FILTER (WHERE p.ewt_kind = 'products'), 0)::text AS ewt_products,
              COALESCE(sum(p.ewt_amount) FILTER (WHERE p.ewt_kind = 'service'), 0)::text AS ewt_service,
              COALESCE(sum(p.ewt_amount), 0)::text AS ewt_amount,
              COALESCE(sum(p.amount), 0)::text AS net_amount
         FROM payables p
         JOIN payable_statuses s ON s.id = p.status_id
        WHERE ${paidWhere}`,
      range,
    ),
    query(
      `SELECT bucket, count(*)::int AS count, COALESCE(sum(amount), 0)::text AS amount
         FROM (
           SELECT p.amount,
                  CASE
                    WHEN p.due_date >= $1::date THEN 'current'
                    WHEN p.due_date >= ($1::date - 30) THEN '1_30'
                    WHEN p.due_date >= ($1::date - 60) THEN '31_60'
                    WHEN p.due_date >= ($1::date - 90) THEN '61_90'
                    ELSE '90_plus'
                  END AS bucket
             FROM payables p
             JOIN payable_statuses s ON s.id = p.status_id
            WHERE COALESCE(p.is_draft, false) = false AND s.category = 'open'
         ) x
        GROUP BY bucket`,
      [today],
    ),
    query(
      `SELECT COALESCE(u.display_name, 'Unassigned') AS name,
              count(*)::int AS count,
              COALESCE(sum(p.amount), 0)::text AS amount,
              count(*) FILTER (WHERE s.category = 'open')::int AS open_count,
              COALESCE(sum(p.amount) FILTER (WHERE s.category = 'open'), 0)::text AS open_amount,
              count(*) FILTER (WHERE s.category = 'paid')::int AS paid_count,
              COALESCE(sum(p.amount) FILTER (WHERE s.category = 'paid'), 0)::text AS paid_amount
         FROM payables p
         JOIN payable_statuses s ON s.id = p.status_id
         LEFT JOIN users u ON u.id = p.assigned_to
        WHERE ${dueWhere}
        GROUP BY u.id, u.display_name
        ORDER BY sum(p.amount) DESC NULLS LAST, name`,
      range,
    ),
    query(
      `SELECT timing, count(*)::int AS count, COALESCE(sum(amount), 0)::text AS amount
         FROM (
           SELECT p.amount,
                  CASE
                    WHEN p.paid_at < p.due_date THEN 'early'
                    WHEN p.paid_at = p.due_date THEN 'on_time'
                    ELSE 'late'
                  END AS timing
             FROM payables p
             JOIN payable_statuses s ON s.id = p.status_id
            WHERE COALESCE(p.is_draft, false) = false
              AND s.category = 'paid'
              AND p.paid_at >= $1 AND p.paid_at <= $2
              AND p.due_date IS NOT NULL
         ) x
        GROUP BY timing`,
      range,
    ),
    query(
      `SELECT h.id,
              h.created_at,
              h.remarks,
              h.payment_reference,
              h.paid_at,
              p.id AS payable_id,
              c.name AS client_name,
              fs.name AS from_status,
              ts.name AS to_status
         FROM payable_status_history h
         JOIN payables p ON p.id = h.payable_id
         JOIN clients c ON c.id = p.client_id
         LEFT JOIN payable_statuses fs ON fs.id = h.from_status_id
         JOIN payable_statuses ts ON ts.id = h.to_status_id
        WHERE COALESCE(p.is_draft, false) = false
          AND (h.created_at AT TIME ZONE $3)::date >= $1::date
          AND (h.created_at AT TIME ZONE $3)::date <= $2::date
          AND h.remarks IS NOT NULL
          AND btrim(h.remarks) <> ''
        ORDER BY h.created_at DESC
        LIMIT 500`,
      [start, end, settings.timezone],
    ),
    query(
      `SELECT pi.id,
              pi.payable_id,
              pi.invoice_no,
              pi.invoice_date,
              pi.gross_amount::text AS gross_amount,
              pi.vat_amount::text AS vat_amount,
              pi.ewt_amount::text AS ewt_amount,
              pi.net_amount::text AS net_amount,
              c.name AS client_name,
              p.due_date,
              p.paid_at,
              s.name AS status_name,
              s.category AS status_category
         FROM payable_invoices pi
         JOIN payables p ON p.id = pi.payable_id
         JOIN clients c ON c.id = p.client_id
         JOIN payable_statuses s ON s.id = p.status_id
        WHERE COALESCE(p.is_draft, false) = false
          AND (
              (s.category = 'paid' AND p.paid_at >= $1 AND p.paid_at <= $2)
           OR (s.category <> 'cancelled' AND p.due_date >= $1 AND p.due_date <= $2)
        )
        ORDER BY c.name, pi.invoice_date NULLS LAST, pi.id
        LIMIT 1000`,
      range,
    ),
  ]);

  const agingOrder = ['current', '1_30', '31_60', '61_90', '90_plus'] as const;
  const agingLabels: Record<(typeof agingOrder)[number], string> = {
    current: 'Current (not yet due)',
    '1_30': '1–30 days overdue',
    '31_60': '31–60 days overdue',
    '61_90': '61–90 days overdue',
    '90_plus': '90+ days overdue',
  };
  const agingMap = new Map(agingRows.rows.map((r) => [r.bucket as string, r]));
  const aging = agingOrder.map((bucket) => ({
    bucket,
    label: agingLabels[bucket],
    count: Number(agingMap.get(bucket)?.count ?? 0),
    amount: String(agingMap.get(bucket)?.amount ?? '0'),
  }));

  const timingOrder = ['early', 'on_time', 'late'] as const;
  const timingLabels: Record<(typeof timingOrder)[number], string> = {
    early: 'Early (before due)',
    on_time: 'On time',
    late: 'Late (after due)',
  };
  const timingMap = new Map(timingRows.rows.map((r) => [r.timing as string, r]));
  const timing = timingOrder.map((key) => ({
    timing: key,
    label: timingLabels[key],
    count: Number(timingMap.get(key)?.count ?? 0),
    amount: String(timingMap.get(key)?.amount ?? '0'),
  }));

  const paid = paidSummary.rows[0];
  const due = dueSummary.rows[0];
  const tax = vatEwt.rows[0];

  res.json({
    ledger,
    period: { ...period, today, timezone: settings.timezone },
    paid: {
      count: Number(paid.count),
      amount: paid.amount,
      gross_amount: paid.gross_amount,
      vat_amount: paid.vat_amount,
      ewt_amount: paid.ewt_amount,
      by_client: paidByClient,
      by_type: paidByType,
      by_method: paidByMethod,
    },
    due: {
      count: Number(due.count),
      amount: due.amount,
      open_count: Number(due.open_count),
      open_amount: due.open_amount,
      paid_count: Number(due.paid_count),
      paid_amount: due.paid_amount,
      by_client: dueByClient,
      by_type: dueByType,
      by_method: dueByMethod,
    },
    vat_ewt: {
      gross_amount: tax.gross_amount,
      vat_amount: tax.vat_amount,
      ewt_products: tax.ewt_products,
      ewt_service: tax.ewt_service,
      ewt_amount: tax.ewt_amount,
      net_amount: tax.net_amount,
    },
    aging: {
      as_of: today,
      buckets: aging,
      total_count: aging.reduce((n, b) => n + b.count, 0),
      total_amount: (
        aging.reduce((n, b) => n + Math.round(Number(b.amount) * 100), 0) / 100
      ).toFixed(2),
    },
    assignees: assignees.rows.map((r) => ({
      name: r.name as string,
      count: Number(r.count),
      amount: String(r.amount),
      open_count: Number(r.open_count),
      open_amount: String(r.open_amount),
      paid_count: Number(r.paid_count),
      paid_amount: String(r.paid_amount),
    })),
    timing,
    status_remarks: historyRows.rows.map((r) => ({
      id: r.id as number,
      created_at: r.created_at as string,
      remarks: r.remarks as string,
      payment_reference: (r.payment_reference as string | null) ?? null,
      paid_at: (r.paid_at as string | null) ?? null,
      payable_id: Number(r.payable_id ?? r.receivable_id),
      client_name: r.client_name as string,
      from_status: (r.from_status as string | null) ?? null,
      to_status: r.to_status as string,
    })),
    invoices: invoiceRows.rows.map((r) => ({
      id: r.id as number,
      payable_id: Number(r.payable_id ?? r.receivable_id),
      invoice_no: (r.invoice_no as string | null) ?? null,
      invoice_date: (r.invoice_date as string | null) ?? null,
      gross_amount: String(r.gross_amount),
      vat_amount: String(r.vat_amount),
      ewt_amount: String(r.ewt_amount),
      net_amount: String(r.net_amount),
      client_name: r.client_name as string,
      due_date: r.due_date as string,
      paid_at: (r.paid_at as string | null) ?? null,
      status_name: r.status_name as string,
      status_category: r.status_category as string,
    })),
  });
});

const askSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  chatId: z.string().uuid().optional(),
});

reportsRouter.post('/ask', async (req, res) => {
  const body = askSchema.parse(req.body);
  const result = await runReportAsk({
    userId: req.user!.id,
    question: body.question,
    chatId: body.chatId,
  });
  res.json(result);
});

const askFileSchema = z.object({
  chatId: z.string().uuid(),
});

reportsRouter.post('/ask/attachment', askUpload.single('file'), async (req, res) => {
  const body = askFileSchema.parse(req.body);
  const file = req.file;
  if (!file?.buffer?.length) throw new HttpError(400, 'No file uploaded (field name: file)');
  try {
    const result = await attachFileToPendingAiAction({
      userId: req.user!.id,
      chatId: body.chatId,
      buffer: file.buffer,
      originalName: file.originalname || 'upload',
      mimeHint: file.mimetype,
    });
    if ('clarify' in result) {
      res.json({
        chatId: body.chatId,
        explanation: result.clarify,
        pendingAction: {
          id: result.pending.id,
          summary: result.pending.summary,
          awaiting: result.pending.awaiting ?? null,
        },
      });
      return;
    }
    res.json({
      chatId: body.chatId,
      explanation: confirmationPrompt(result.summary),
      pendingAction: {
        id: result.pending.id,
        summary: result.pending.summary,
        awaiting: null,
      },
    });
  } catch (err) {
    if (err instanceof AiActionClarifyError) {
      res.json({
        chatId: body.chatId,
        explanation: err.question,
        pendingAction: null,
      });
      return;
    }
    throw err;
  } finally {
    if (file.path) await fs.promises.rm(file.path, { force: true }).catch(() => undefined);
  }
});

reportsRouter.get('/telegram/status', async (req, res) => {
  const status = await getTelegramLinkStatusForUser(req.user!.id);
  res.json(status);
});

reportsRouter.get('/telegram/links', async (_req, res) => {
  const [links, pendingCodes] = await Promise.all([listTelegramLinks(), listPendingTelegramLinkCodes()]);
  res.json({
    links,
    pendingCodes,
    botConfigured: telegramEnabled(),
  });
});

const linkCodeSchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
});

reportsRouter.post('/telegram/link-code', async (req, res) => {
  const body = linkCodeSchema.parse(req.body ?? {});
  const targetUserId = body.userId ?? req.user!.id;
  const result = await createTelegramLinkCode(targetUserId);
  res.json(result);
});

reportsRouter.delete('/telegram/link-code/:code', async (req, res) => {
  const removed = await cancelTelegramLinkCode(String(req.params.code ?? ''));
  if (!removed) throw new HttpError(404, 'Link code not found');
  res.json({ ok: true });
});

reportsRouter.delete('/telegram/link', async (req, res) => {
  const userIdRaw = req.query.userId ?? req.body?.userId;
  const parsed =
    userIdRaw != null && String(userIdRaw).trim() !== ''
      ? z.coerce.number().int().positive().safeParse(userIdRaw)
      : null;
  if (parsed && !parsed.success) throw new HttpError(400, 'Invalid userId');
  const targetUserId = parsed?.success ? parsed.data : req.user!.id;
  await unlinkTelegramByUserId(targetUserId);
  res.json({ ok: true });
});
