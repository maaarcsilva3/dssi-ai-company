import { Router, type NextFunction, type Request, type Response } from 'express';
import { pool, withTransaction } from '../db';
import { HttpError, notFound } from '../lib/http';
import { isAdmin, requireAuth, requirePermission, type AuthUser } from '../lib/auth';
import {
  assertAccountActive,
  assertSufficientFunds,
  availableBalance,
  insertTransfer,
} from '../lib/sourceAccounts';
import {
  boolQuery,
  idParam,
  sourceAccountSchema,
  sourceTransferSchema,
  sourceTxnCreateSchema,
  sourceTxnPatchSchema,
  SOURCE_TXN_STATUSES,
  type SourceTxnStatus,
} from '../lib/validation';

function requireSourceAccountsAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(new HttpError(401, 'Authentication required'));
  if (isAdmin(req.user)) return next();
  return next(new HttpError(403, 'Only admins can manage source accounts'));
}

const TXN_SELECT = `
  SELECT t.id, t.source_account_id, t.deposit_amount::text, t.withdraw_amount::text,
         t.transaction_date, t.status, t.remarks, t.payable_id, t.receivable_id, t.transfer_group_id,
         t.created_by, t.created_at, t.updated_at,
         a.bank_name, a.account_number,
         u.display_name AS created_by_name
    FROM source_account_transactions t
    JOIN source_accounts a ON a.id = t.source_account_id
    LEFT JOIN users u ON u.id = t.created_by`;

const ACCOUNT_BALANCE_SQL = `
  SELECT a.*,
         (
           COALESCE(SUM(t.deposit_amount) FILTER (WHERE t.status = 'POSTED'), 0)
           - COALESCE(SUM(t.withdraw_amount) FILTER (
               WHERE t.status IN ('POSTED', 'PENDING', 'RESERVED', 'ON_HOLD')
             ), 0)
         )::text AS available_balance
    FROM source_accounts a
    LEFT JOIN source_account_transactions t ON t.source_account_id = a.id`;

async function fetchAccount(id: number) {
  const { rows } = await pool.query(`${ACCOUNT_BALANCE_SQL} WHERE a.id = $1 GROUP BY a.id`, [id]);
  if (!rows[0]) throw notFound('Source account');
  return rows[0];
}

function canListAccounts(user: AuthUser) {
  return (
    user.role === 'admin' ||
    user.permissions.source_accounts ||
    user.permissions.payables_status ||
    user.permissions.receivables_status
  );
}

export const sourceAccountsRouter = Router();

sourceAccountsRouter.get('/', requireAuth, async (req, res) => {
  if (!canListAccounts(req.user!)) throw new HttpError(403, 'Forbidden');
  const includeInactive = boolQuery.optional().parse(req.query.includeInactive) ?? false;
  const { rows } = await pool.query(
    `${ACCOUNT_BALANCE_SQL}
      ${includeInactive ? '' : 'WHERE a.active'}
      GROUP BY a.id
      ORDER BY lower(a.bank_name), lower(a.account_number)`,
  );
  res.json(rows);
});

sourceAccountsRouter.get('/transactions', requirePermission('source_accounts'), async (req, res) => {
  const accountId = req.query.accountId ? Number(req.query.accountId) : null;
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const params: unknown[] = [];
  const where: string[] = [];
  if (accountId && Number.isFinite(accountId)) {
    params.push(accountId);
    where.push(`t.source_account_id = $${params.length}`);
  }
  if (status && (SOURCE_TXN_STATUSES as readonly string[]).includes(status)) {
    params.push(status);
    where.push(`t.status = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `${TXN_SELECT} ${whereSql} ORDER BY t.transaction_date DESC, t.id DESC LIMIT 500`,
    params,
  );
  res.json(rows);
});

sourceAccountsRouter.post('/transfer', requirePermission('source_accounts'), async (req, res) => {
  const data = sourceTransferSchema.parse(req.body);
  const ids = await withTransaction(async (db) =>
    insertTransfer(db, {
      fromAccountId: data.from_account_id,
      toAccountId: data.to_account_id,
      amount: Number(data.amount),
      transactionDate: data.transaction_date,
      status: data.status,
      remarks: data.remarks ?? null,
      userId: req.user!.id,
    }),
  );
  const { rows } = await pool.query(
    `${TXN_SELECT} WHERE t.transfer_group_id = $1 ORDER BY t.withdraw_amount DESC, t.id`,
    [ids.transfer_group_id],
  );
  res.status(201).json({ ...ids, transactions: rows });
});

sourceAccountsRouter.post('/transactions', requirePermission('source_accounts'), async (req, res) => {
  const data = sourceTxnCreateSchema.parse(req.body);
  const result = await withTransaction(async (db) => {
    await assertAccountActive(db, data.source_account_id);
    const deposit = data.deposit_amount ? Number(data.deposit_amount) : 0;
    const withdraw = data.withdraw_amount ? Number(data.withdraw_amount) : 0;
    const status = data.status as SourceTxnStatus;
    if (status === 'REVERSED') {
      throw new HttpError(
        400,
        'Mark an existing posted transaction as REVERSED instead of creating a new reversed line',
      );
    }
    if (withdraw > 0 && ['POSTED', 'PENDING', 'RESERVED', 'ON_HOLD'].includes(status)) {
      await assertSufficientFunds(db, data.source_account_id, withdraw);
    }
    const { rows } = await db.query(
      `INSERT INTO source_account_transactions
         (source_account_id, deposit_amount, withdraw_amount, transaction_date, status, remarks, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        data.source_account_id,
        deposit,
        withdraw,
        data.transaction_date,
        status,
        data.remarks?.trim() || null,
        req.user!.id,
      ],
    );
    return rows[0].id as number;
  });
  const { rows } = await pool.query(`${TXN_SELECT} WHERE t.id = $1`, [result]);
  res.status(201).json(rows[0]);
});

sourceAccountsRouter.patch('/transactions/:id', requirePermission('source_accounts'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const body = sourceTxnPatchSchema.parse(req.body);
  await withTransaction(async (db) => {
    const { rows } = await db.query<{
      id: number;
      source_account_id: number;
      withdraw_amount: string;
      status: SourceTxnStatus;
      remarks: string | null;
      transaction_date: string;
    }>(
      `SELECT id, source_account_id, withdraw_amount::text, status, remarks, transaction_date
         FROM source_account_transactions WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!rows[0]) throw notFound('Transaction');
    const current = rows[0];
    const nextStatus = (body.status ?? current.status) as SourceTxnStatus;
    const nextDate = body.transaction_date ?? current.transaction_date;
    const nextRemarks = body.remarks !== undefined ? body.remarks?.trim() || null : current.remarks;
    const withdraw = Number(current.withdraw_amount);
    if (withdraw > 0 && ['POSTED', 'PENDING', 'RESERVED', 'ON_HOLD'].includes(nextStatus)) {
      await assertSufficientFunds(db, current.source_account_id, withdraw, id);
    }
    await db.query(
      `UPDATE source_account_transactions
          SET status = $1, remarks = $2, transaction_date = $3
        WHERE id = $4`,
      [nextStatus, nextRemarks, nextDate, id],
    );
  });
  const { rows } = await pool.query(`${TXN_SELECT} WHERE t.id = $1`, [id]);
  res.json(rows[0]);
});

sourceAccountsRouter.get('/:id', requirePermission('source_accounts'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await fetchAccount(id));
});

sourceAccountsRouter.get('/:id/balance', requirePermission('source_accounts'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { rows } = await pool.query('SELECT id FROM source_accounts WHERE id = $1', [id]);
  if (!rows[0]) throw notFound('Source account');
  const balance = await availableBalance(pool, id);
  res.json({ source_account_id: id, available_balance: balance.toFixed(2) });
});

sourceAccountsRouter.post('/', requireSourceAccountsAdmin, async (req, res) => {
  const data = sourceAccountSchema.parse(req.body);
  const accountId = await withTransaction(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO source_accounts (bank_name, account_number, active)
       VALUES ($1, $2, $3) RETURNING id`,
      [data.bank_name, data.account_number, data.active ?? true],
    );
    const id = rows[0].id as number;
    if (data.initial_deposit) {
      const depositDate = data.initial_deposit_date ?? new Date().toISOString().slice(0, 10);
      await db.query(
        `INSERT INTO source_account_transactions
           (source_account_id, deposit_amount, withdraw_amount, transaction_date, status, remarks, created_by)
         VALUES ($1, $2, 0, $3, 'POSTED', $4, $5)`,
        [
          id,
          data.initial_deposit,
          depositDate,
          data.initial_deposit_remarks?.trim() || 'Initial funds',
          req.user!.id,
        ],
      );
    }
    return id;
  });
  res.status(201).json(await fetchAccount(accountId));
});

sourceAccountsRouter.put('/:id', requireSourceAccountsAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const data = sourceAccountSchema
    .omit({ initial_deposit: true, initial_deposit_date: true, initial_deposit_remarks: true })
    .parse(req.body);
  const { rowCount } = await pool.query(
    `UPDATE source_accounts SET bank_name = $1, account_number = $2, active = $3 WHERE id = $4`,
    [data.bank_name, data.account_number, data.active ?? true, id],
  );
  if (!rowCount) throw notFound('Source account');
  res.json(await fetchAccount(id));
});

sourceAccountsRouter.delete('/:id', requireSourceAccountsAdmin, async (req, res) => {
  const { id } = idParam.parse(req.params);
  const inUse = await pool.query<{ in_use: boolean }>(
    `SELECT (
        EXISTS (SELECT 1 FROM source_account_transactions WHERE source_account_id = $1)
        OR EXISTS (SELECT 1 FROM payables WHERE source_account_id = $1)
      ) AS in_use`,
    [id],
  );
  if (inUse.rows[0]?.in_use) {
    const { rowCount } = await pool.query(`UPDATE source_accounts SET active = FALSE WHERE id = $1`, [id]);
    if (!rowCount) throw notFound('Source account');
    res.json({ deleted: false, deactivated: true });
    return;
  }
  const { rowCount } = await pool.query(`DELETE FROM source_accounts WHERE id = $1`, [id]);
  if (!rowCount) throw notFound('Source account');
  res.json({ deleted: true, deactivated: false });
});
