import { randomUUID } from 'node:crypto';
import type { Queryable } from '../db';
import { HttpError } from './http';
import { fundRemark, isReserveStatus, PAYABLE_LEDGER, type LedgerSpec } from './ledger';
import type { SourceTxnStatus } from './validation';

/** Statuses that reduce available balance for withdrawals. */
const WITHDRAW_BALANCE_STATUSES: SourceTxnStatus[] = ['POSTED', 'PENDING', 'RESERVED', 'ON_HOLD'];

export function isScheduledStatus(name: string): boolean {
  return isReserveStatus(name, 'create check for deposit');
}

export async function availableBalance(db: Queryable, accountId: number, excludeTxnId?: number): Promise<number> {
  const { rows } = await db.query<{ balance: string }>(
    `SELECT (
        COALESCE(SUM(deposit_amount) FILTER (WHERE status = 'POSTED'), 0)
        - COALESCE(SUM(withdraw_amount) FILTER (WHERE status = ANY($2::source_txn_status[])), 0)
      )::text AS balance
       FROM source_account_transactions
      WHERE source_account_id = $1
        AND ($3::int IS NULL OR id <> $3)`,
    [accountId, WITHDRAW_BALANCE_STATUSES, excludeTxnId ?? null],
  );
  return Number(rows[0]?.balance ?? 0);
}

export async function assertAccountActive(db: Queryable, accountId: number) {
  const { rows } = await db.query<{ id: number; bank_name: string; account_number: string; active: boolean }>(
    'SELECT id, bank_name, account_number, active FROM source_accounts WHERE id = $1',
    [accountId],
  );
  if (!rows[0]) throw new HttpError(400, 'Unknown source account');
  if (!rows[0].active) throw new HttpError(400, 'Source account is inactive');
  return rows[0];
}

export async function assertSufficientFunds(
  db: Queryable,
  accountId: number,
  withdrawAmount: number,
  excludeTxnId?: number,
) {
  const bal = await availableBalance(db, accountId, excludeTxnId);
  if (withdrawAmount > bal + 1e-9) {
    throw new HttpError(400, `Insufficient available balance on source account (available ${bal.toFixed(2)})`);
  }
}

interface FundDocRow {
  id: number;
  amount: string;
  invoice_no: string | null;
  source_account_id: number | null;
}

async function findLinkedFundLine(db: Queryable, spec: LedgerSpec, documentId: number) {
  const amountCol = spec.cash === 'deposit' ? 'deposit_amount' : 'withdraw_amount';
  // Prefer an open reservation over a cancelled/posted historical row.
  const { rows } = await db.query<{
    id: number;
    source_account_id: number;
    status: SourceTxnStatus;
  }>(
    `SELECT id, source_account_id, status
       FROM source_account_transactions
      WHERE ${spec.parentFk} = $1 AND ${amountCol} > 0
      ORDER BY CASE status
                 WHEN 'PENDING' THEN 0
                 WHEN 'ON_HOLD' THEN 1
                 WHEN 'RESERVED' THEN 2
                 WHEN 'POSTED' THEN 3
                 ELSE 4
               END,
               id DESC
      LIMIT 1`,
    [documentId],
  );
  return rows[0] ?? null;
}

/**
 * Reserve or post the source-account line for a payable (withdrawal) or receivable (deposit).
 * → reserve status: require source_account_id, upsert PENDING line.
 * → paid / deposited: POST any open reservation, or create a POSTED line when a source account is set.
 * → cancelled / leave reserve: CANCELLED.
 * Pending deposits do not increase available balance. Withdrawals must fit the available balance.
 */
export async function syncDocumentFunds(
  db: Queryable,
  spec: LedgerSpec,
  opts: {
    documentId: number;
    fromStatusName: string | null;
    toStatusName: string;
    toCategory: string;
    sourceAccountId?: number | null;
    userId: number | null;
    today: string;
  },
) {
  const { rows } = await db.query<FundDocRow>(
    `SELECT p.id, p.amount::text, p.invoice_no, p.source_account_id
       FROM ${spec.document} p
      WHERE p.id = $1`,
    [opts.documentId],
  );
  const doc = rows[0];
  if (!doc) return;

  const toReserve = isReserveStatus(opts.toStatusName, spec.reserveName);
  const fromReserve = opts.fromStatusName ? isReserveStatus(opts.fromStatusName, spec.reserveName) : false;
  const linked = await findLinkedFundLine(db, spec, opts.documentId);
  const amount = Number(doc.amount);
  const remarks = fundRemark(spec, doc.invoice_no, opts.documentId);
  const deposit = spec.cash === 'deposit' ? amount : 0;
  const withdraw = spec.cash === 'withdraw' ? amount : 0;
  const openStatuses: SourceTxnStatus[] = ['PENDING', 'ON_HOLD', 'RESERVED'];

  if (toReserve) {
    const accountId = opts.sourceAccountId ?? doc.source_account_id;
    if (!accountId) {
      throw new HttpError(400, 'Validation failed', {
        fieldErrors: { source_account_id: [spec.reserveError] },
      });
    }
    await assertAccountActive(db, accountId);

    if (linked && openStatuses.includes(linked.status)) {
      if (spec.cash === 'withdraw') await assertSufficientFunds(db, accountId, amount, linked.id);
      await db.query(
        `UPDATE source_account_transactions
            SET source_account_id = $1, withdraw_amount = $2, deposit_amount = $3,
                status = 'PENDING', remarks = $4, transaction_date = $5
          WHERE id = $6`,
        [accountId, withdraw, deposit, remarks, opts.today, linked.id],
      );
    } else {
      if (spec.cash === 'withdraw') await assertSufficientFunds(db, accountId, amount);
      await db.query(
        `INSERT INTO source_account_transactions
           (source_account_id, deposit_amount, withdraw_amount, transaction_date, status, remarks, ${spec.parentFk}, created_by)
         VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7)`,
        [accountId, deposit, withdraw, opts.today, remarks, opts.documentId, opts.userId],
      );
    }
    await db.query(`UPDATE ${spec.document} SET source_account_id = $1 WHERE id = $2`, [accountId, opts.documentId]);
    return;
  }

  // Deposited / paid: post the reserved withdrawal (or create one if the payable has a source account).
  if (opts.toCategory === 'paid') {
    if (linked?.status === 'POSTED') return;

    const accountId =
      opts.sourceAccountId ?? doc.source_account_id ?? linked?.source_account_id ?? null;

    if (linked && openStatuses.includes(linked.status)) {
      const postAccountId = accountId ?? linked.source_account_id;
      await db.query(
        `UPDATE source_account_transactions
            SET status = 'POSTED',
                source_account_id = $1,
                withdraw_amount = $2,
                deposit_amount = $3,
                remarks = $4,
                transaction_date = $5
          WHERE id = $6`,
        [postAccountId, withdraw, deposit, remarks, opts.today, linked.id],
      );
      if (postAccountId) {
        await db.query(`UPDATE ${spec.document} SET source_account_id = $1 WHERE id = $2`, [
          postAccountId,
          opts.documentId,
        ]);
      }
      return;
    }

    if (accountId) {
      await assertAccountActive(db, accountId);
      if (spec.cash === 'withdraw') await assertSufficientFunds(db, accountId, amount);
      await db.query(
        `INSERT INTO source_account_transactions
           (source_account_id, deposit_amount, withdraw_amount, transaction_date, status, remarks, ${spec.parentFk}, created_by)
         VALUES ($1, $2, $3, $4, 'POSTED', $5, $6, $7)`,
        [accountId, deposit, withdraw, opts.today, remarks, opts.documentId, opts.userId],
      );
      await db.query(`UPDATE ${spec.document} SET source_account_id = $1 WHERE id = $2`, [accountId, opts.documentId]);
    }
    return;
  }

  if (linked && openStatuses.includes(linked.status) && (opts.toCategory === 'cancelled' || fromReserve)) {
    await db.query(`UPDATE source_account_transactions SET status = 'CANCELLED' WHERE id = $1`, [linked.id]);
    // Only clear the payable's source account when cancelling — keep it when moving to
    // another open status so status updates don't wipe it.
    if (opts.toCategory === 'cancelled') {
      await db.query(`UPDATE ${spec.document} SET source_account_id = NULL WHERE id = $1`, [opts.documentId]);
    }
  }
}

/** @deprecated Use syncDocumentFunds. Kept so existing payable call sites stay valid during the ledger split. */
export async function syncPayableSourceWithdrawal(
  db: Queryable,
  opts: {
    payableId: number;
    fromStatusName: string | null;
    toStatusName: string;
    toCategory: string;
    sourceAccountId?: number | null;
    userId: number | null;
    today: string;
  },
) {
  await syncDocumentFunds(db, PAYABLE_LEDGER, {
    documentId: opts.payableId,
    fromStatusName: opts.fromStatusName,
    toStatusName: opts.toStatusName,
    toCategory: opts.toCategory,
    sourceAccountId: opts.sourceAccountId,
    userId: opts.userId,
    today: opts.today,
  });
}

/**
 * When a document is deleted, undo linked fund lines so balances stay honest:
 * POSTED → REVERSED; PENDING / RESERVED / ON_HOLD → CANCELLED.
 */
export async function undoDocumentFunds(db: Queryable, spec: LedgerSpec, documentId: number) {
  await db.query(
    `UPDATE source_account_transactions
        SET status = CASE
              WHEN status = 'POSTED' THEN 'REVERSED'::source_txn_status
              WHEN status IN ('PENDING', 'RESERVED', 'ON_HOLD') THEN 'CANCELLED'::source_txn_status
              ELSE status
            END
      WHERE ${spec.parentFk} = $1
        AND status IN ('POSTED', 'PENDING', 'RESERVED', 'ON_HOLD')`,
    [documentId],
  );
}

export async function undoPayableSourceTransactions(db: Queryable, payableId: number) {
  await undoDocumentFunds(db, PAYABLE_LEDGER, payableId);
}

export async function insertTransfer(
  db: Queryable,
  opts: {
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    transactionDate: string;
    status: SourceTxnStatus;
    remarks: string | null;
    userId: number | null;
  },
) {
  if (opts.fromAccountId === opts.toAccountId) {
    throw new HttpError(400, 'Cannot transfer to the same account');
  }
  if (opts.status === 'REVERSED') {
    throw new HttpError(
      400,
      'Mark an existing posted transaction as REVERSED instead of creating a new reversed line',
    );
  }
  await assertAccountActive(db, opts.fromAccountId);
  await assertAccountActive(db, opts.toAccountId);
  if (WITHDRAW_BALANCE_STATUSES.includes(opts.status)) {
    await assertSufficientFunds(db, opts.fromAccountId, opts.amount);
  }
  const groupId = randomUUID();
  const remark = opts.remarks?.trim() || 'Transfer';
  const { rows: fromAcct } = await db.query<{ bank_name: string; account_number: string }>(
    'SELECT bank_name, account_number FROM source_accounts WHERE id = $1',
    [opts.fromAccountId],
  );
  const { rows: toAcct } = await db.query<{ bank_name: string; account_number: string }>(
    'SELECT bank_name, account_number FROM source_accounts WHERE id = $1',
    [opts.toAccountId],
  );
  const withdrawRemarks = `${remark} to ${toAcct[0].bank_name} ${toAcct[0].account_number}`.trim();
  const depositRemarks = `${remark} from ${fromAcct[0].bank_name} ${fromAcct[0].account_number}`.trim();

  const withdraw = await db.query(
    `INSERT INTO source_account_transactions
       (source_account_id, deposit_amount, withdraw_amount, transaction_date, status, remarks, transfer_group_id, created_by)
     VALUES ($1, 0, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [opts.fromAccountId, opts.amount, opts.transactionDate, opts.status, withdrawRemarks, groupId, opts.userId],
  );
  const deposit = await db.query(
    `INSERT INTO source_account_transactions
       (source_account_id, deposit_amount, withdraw_amount, transaction_date, status, remarks, transfer_group_id, created_by)
     VALUES ($1, $2, 0, $3, $4, $5, $6, $7) RETURNING id`,
    [opts.toAccountId, opts.amount, opts.transactionDate, opts.status, depositRemarks, groupId, opts.userId],
  );
  return { transfer_group_id: groupId, withdraw_id: withdraw.rows[0].id, deposit_id: deposit.rows[0].id };
}
