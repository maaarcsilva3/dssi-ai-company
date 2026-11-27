import { Router } from 'express';
import { pool, withTransaction, type Queryable } from '../db';
import { HttpError } from '../lib/http';
import { isReserveStatus, PAYABLE_LEDGER, RECEIVABLE_LEDGER, type LedgerSpec } from '../lib/ledger';
import { daysBetween, nextReleaseDate, releaseWindow, todayInTimezone } from '../lib/releaseWindow';
import { syncDocumentFunds } from '../lib/sourceAccounts';
import { bulkStatusSchema, upcomingQuery, type StatusCategory } from '../lib/validation';
import { isAdmin, requirePermission } from '../lib/auth';
import {
  assertCanChangeAssignedStatus,
  assertCanReassignPayable,
  assertCanSetPayableStatus,
  assertPayableStatusTransition,
  getPayableStatusWorkflow,
  resolvePayableAssigneeOnStatusMove,
} from '../lib/payableStatusAccess';
import { documentSelect } from './ledgerDocuments';
import { getSettings } from './settings';

interface StatusRow {
  id: number;
  name: string;
  category: StatusCategory;
  sort_order: number;
}

async function resolveStatus(db: Queryable, spec: LedgerSpec, statusId: number): Promise<StatusRow> {
  const { rows } = await db.query<StatusRow>(
    `SELECT id, name, category, sort_order FROM ${spec.statuses} WHERE id = $1`,
    [statusId],
  );
  if (!rows[0]) throw new HttpError(400, 'Unknown status');
  return rows[0];
}

async function assertRemarksForCancelled(status: StatusRow, remarks?: string | null) {
  if (status.category === 'cancelled' && !remarks?.trim()) {
    throw new HttpError(400, 'Validation failed', { fieldErrors: { remarks: ['Remarks are required when cancelling'] } });
  }
}

async function insertStatusHistory(
  db: Queryable,
  spec: LedgerSpec,
  opts: {
    documentId: number;
    fromStatusId: number | null;
    toStatusId: number;
    remarks?: string | null;
    paymentReference?: string | null;
    paidAt?: string | null;
    changedBy?: number | null;
    checkDate?: string | null;
  },
) {
  await db.query(
    `INSERT INTO ${spec.history}
       (${spec.parentFk}, from_status_id, to_status_id, remarks, payment_reference, paid_at, changed_by, check_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      opts.documentId,
      opts.fromStatusId,
      opts.toStatusId,
      opts.remarks?.trim() || null,
      opts.paymentReference ?? null,
      opts.paidAt ?? null,
      opts.changedBy ?? null,
      opts.checkDate ?? null,
    ],
  );
}

/** Upcoming release (payables) or collection (receivables), plus bulk status changes. */
export function createWindowRouter(spec: LedgerSpec) {
  const router = Router();
  const select = documentSelect(spec);

  router.get('/upcoming', async (req, res) => {
    const q = upcomingQuery.parse(req.query);
    const settings = await getSettings();
    const today = todayInTimezone(settings.timezone);

    const releaseDate = q.releaseDate ?? nextReleaseDate(today, settings.release_weekday);
    const daysBefore = q.daysBefore ?? settings.days_before;
    const daysAfter = q.daysAfter ?? settings.days_after;
    const includeOverdue = q.includeOverdue ?? settings.include_overdue;
    const window = releaseWindow(releaseDate, daysBefore, daysAfter);

    const params: unknown[] = [window.windowStart, window.windowEnd, includeOverdue, q.showPaid];
    let where = `
    WHERE COALESCE(p.is_draft, false) = false
      AND p.due_date <= $2
      AND (
        (s.category = 'open' AND (p.due_date >= $1 OR $3::boolean))
        OR
        ($4::boolean AND s.category = 'paid' AND (p.due_date >= $1 OR ($3::boolean AND p.paid_at >= $1)))
      )`;
    if (!isAdmin(req.user!)) {
      params.push(req.user!.id);
      where += ` AND (p.assigned_to = $${params.length} OR p.created_by = $${params.length})`;
    }
    if (q.reference) {
      params.push(`%${q.reference}%`);
      where += ` AND p.payment_reference ILIKE $${params.length}`;
    }

    const sums = `
    count(*) FILTER (WHERE s.category = 'open')::int AS count,
    COALESCE(sum(p.amount) FILTER (WHERE s.category = 'open'), 0)::text AS amount,
    count(*) FILTER (WHERE s.category = 'paid')::int AS paid_count,
    COALESCE(sum(p.amount) FILTER (WHERE s.category = 'paid'), 0)::text AS paid_amount`;
    const statusJoin = `JOIN ${spec.statuses} s ON s.id = p.status_id`;

    const [items, overall, byMethod, byClient] = await Promise.all([
      pool.query(
        `${select} ${where} ORDER BY m.name, (s.category = 'paid'), p.due_date, lower(c.name), p.id`,
        params,
      ),
      pool.query(
        `SELECT ${sums},
              COALESCE(sum(p.amount) FILTER (WHERE s.category = 'open' AND p.due_date < $1), 0)::text AS carried_over_amount
         FROM ${spec.document} p ${statusJoin} ${where}`,
        params,
      ),
      pool.query(
        `SELECT m.id, m.name, ${sums}
         FROM ${spec.document} p ${statusJoin} JOIN payment_methods m ON m.id = p.payment_method_id ${where}
        GROUP BY m.id, m.name ORDER BY m.name`,
        params,
      ),
      pool.query(
        `SELECT c.id, c.name, ${sums}
         FROM ${spec.document} p ${statusJoin} JOIN ${spec.party} c ON c.id = p.client_id ${where}
        GROUP BY c.id, c.name ORDER BY sum(p.amount) DESC`,
        params,
      ),
    ]);

    res.json({
      today,
      releaseDate: window.releaseDate,
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      daysBefore,
      daysAfter,
      includeOverdue,
      showPaid: q.showPaid,
      releaseWeekday: settings.release_weekday,
      items: items.rows.map((row) => {
        const isPaid = row.status_category === 'paid';
        const itemRelease: string = isPaid && row.paid_at ? row.paid_at : window.releaseDate;
        return {
          ...row,
          release_date: itemRelease,
          days_before_due: daysBetween(itemRelease, row.due_date),
          carried_over: row.due_date < window.windowStart,
          past_due: !isPaid && row.due_date < today,
        };
      }),
      totals: {
        overall: overall.rows[0],
        byMethod: byMethod.rows,
        byClient: byClient.rows,
      },
    });
  });

  router.post('/set-status', requirePermission(spec.perms.status), async (req, res) => {
    const body = bulkStatusSchema.parse(req.body);
    const ids = body.items.map((i) => i.id);
    if (new Set(ids).size !== ids.length) throw new HttpError(400, `Duplicate ${spec.noun.toLowerCase()} ids`);

    const updated = await withTransaction(async (db) => {
      const status = await resolveStatus(db, spec, body.status_id);
      await assertRemarksForCancelled(status, body.remarks);
      await assertCanSetPayableStatus(db, req.user!, status.id, spec.kind);
      if (spec.kind === 'payable' && status.category === 'paid' && !body.check_date) {
        throw new HttpError(400, 'Validation failed', {
          fieldErrors: { check_date: ['Check date is required when marking deposited/paid'] },
        });
      }
      const settings = await getSettings(db);
      const today = todayInTimezone(settings.timezone);

      const { rows } = await db.query(
        `SELECT p.id, p.status_id, p.assigned_to, p.payment_reference, p.paid_at, p.check_date, p.source_account_id,
              s.category, s.name AS status_name, m.name AS method, m.requires_reference
         FROM ${spec.document} p
         JOIN payment_methods m ON m.id = p.payment_method_id
         JOIN ${spec.statuses} s ON s.id = p.status_id
        WHERE p.id = ANY($1::int[])
        FOR UPDATE OF p`,
        [ids],
      );
      const byId = new Map(rows.map((r) => [r.id, r]));

      const problems: string[] = [];
      const toReserve = isReserveStatus(status.name, spec.reserveName);
      const workflowStatus =
        spec.kind === 'payable' ? await getPayableStatusWorkflow(db, status.id) : null;
      if (
        workflowStatus &&
        (workflowStatus.require_file || workflowStatus.custom_fields.length > 0)
      ) {
        throw new HttpError(
          400,
          `“${status.name}” requires a file and/or custom field — change status on each payable individually`,
        );
      }

      for (const item of body.items) {
        const row = byId.get(item.id);
        if (!row) problems.push(`#${item.id}: not found`);
        else {
          try {
            assertCanChangeAssignedStatus(req.user!, row.assigned_to, spec.noun);
          } catch {
            problems.push(`#${item.id}: not assigned to you`);
          }
          if (status.category === 'paid' && row.requires_reference && !(item.payment_reference ?? row.payment_reference)) {
            problems.push(`#${item.id}: ${row.method} requires a payment reference`);
          }
          if (toReserve && body.source_account_id == null && row.source_account_id == null) {
            problems.push(`#${item.id}: ${spec.reserveError}`);
          }
          if (spec.kind === 'payable' && status.id !== row.status_id) {
            try {
              await assertPayableStatusTransition(db, row.status_id, status.id);
            } catch {
              problems.push(`#${item.id}: cannot jump to ${status.name} from current status`);
            }
          }
        }
      }
      if (problems.length) throw new HttpError(400, `Cannot set status to ${status.name}`, { problems });

      let nextAssigneeId: number | null | undefined = undefined;
      if (spec.kind !== 'payable' && body.assigned_to !== undefined) {
        if (body.assigned_to == null) {
          if (!isAdmin(req.user!)) {
            throw new HttpError(400, 'Validation failed', {
              fieldErrors: { assigned_to: ['Only an admin can clear the assignee'] },
            });
          }
          nextAssigneeId = null;
        } else {
          const { rows: staff } = await db.query<{ id: number }>(
            `SELECT id FROM users WHERE id = $1 AND active AND role = 'staff'`,
            [body.assigned_to],
          );
          if (!staff[0]) {
            throw new HttpError(400, 'Validation failed', {
              fieldErrors: { assigned_to: ['Unknown or inactive staff user'] },
            });
          }
          nextAssigneeId = staff[0].id;
        }
        for (const item of body.items) {
          const row = byId.get(item.id);
          if (row) assertCanReassignPayable(req.user!, row.assigned_to, spec.noun);
        }
      }

      for (const item of body.items) {
        const row = byId.get(item.id);
        const paidAt =
          status.category === 'paid' ? (body.paid_at ?? (row.category === 'paid' ? row.paid_at : null) ?? today) : null;
        const reference = item.payment_reference ?? row.payment_reference;
        const checkDate = status.category === 'paid' ? (body.check_date ?? row.check_date ?? null) : null;
        const assignedTo =
          spec.kind === 'payable'
            ? status.id !== row.status_id
              ? await resolvePayableAssigneeOnStatusMove(
                  db,
                  status,
                  body.assigned_to,
                  row.assigned_to as number | null,
                )
              : row.assigned_to
            : nextAssigneeId !== undefined
              ? nextAssigneeId
              : row.assigned_to;
        await db.query(
          `UPDATE ${spec.document}
            SET status_id = $1, paid_at = $2, payment_reference = COALESCE($3, payment_reference),
                check_date = $4, assigned_to = $5
          WHERE id = $6`,
          [status.id, paidAt, item.payment_reference ?? null, checkDate, assignedTo, item.id],
        );
        if (status.id !== row.status_id) {
          await insertStatusHistory(db, spec, {
            documentId: item.id,
            fromStatusId: row.status_id,
            toStatusId: status.id,
            remarks: body.remarks,
            paymentReference: reference,
            paidAt,
            changedBy: req.user!.id,
            checkDate,
          });
          await syncDocumentFunds(db, spec, {
            documentId: item.id,
            fromStatusName: row.status_name,
            toStatusName: status.name,
            toCategory: status.category,
            sourceAccountId: body.source_account_id ?? row.source_account_id,
            userId: req.user!.id,
            today,
          });
        }
      }
      return { count: body.items.length, status: status.name, paid_at: status.category === 'paid' ? (body.paid_at ?? today) : null };
    });

    res.json(updated);
  });

  return router;
}

export const releasesRouter = createWindowRouter(PAYABLE_LEDGER);
export const collectionsRouter = createWindowRouter(RECEIVABLE_LEDGER);
