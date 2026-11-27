-- Source accounts (bank funds) with deposit/withdraw ledger, linked to payables when Scheduled.

CREATE TYPE source_txn_status AS ENUM (
  'PENDING',
  'POSTED',
  'RESERVED',
  'CANCELLED',
  'REVERSED',
  'ON_HOLD'
);

CREATE TABLE source_accounts (
  id             SERIAL PRIMARY KEY,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX source_accounts_bank_acct_uq
  ON source_accounts (lower(bank_name), lower(account_number));

CREATE TRIGGER source_accounts_updated_at
  BEFORE UPDATE ON source_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE source_account_transactions (
  id                 SERIAL PRIMARY KEY,
  source_account_id  INTEGER NOT NULL REFERENCES source_accounts(id),
  deposit_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  withdraw_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (withdraw_amount >= 0),
  transaction_date   DATE NOT NULL,
  status             source_txn_status NOT NULL DEFAULT 'PENDING',
  remarks            TEXT,
  payable_id         INTEGER REFERENCES payables(id) ON DELETE SET NULL,
  transfer_group_id  UUID,
  created_by         INTEGER REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT source_txn_one_side CHECK (
    (deposit_amount > 0 AND withdraw_amount = 0)
    OR (withdraw_amount > 0 AND deposit_amount = 0)
  )
);

CREATE INDEX source_account_transactions_account_idx
  ON source_account_transactions (source_account_id, transaction_date DESC, id DESC);
CREATE INDEX source_account_transactions_payable_idx
  ON source_account_transactions (payable_id)
  WHERE payable_id IS NOT NULL;
CREATE INDEX source_account_transactions_transfer_idx
  ON source_account_transactions (transfer_group_id)
  WHERE transfer_group_id IS NOT NULL;

CREATE TRIGGER source_account_transactions_updated_at
  BEFORE UPDATE ON source_account_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE payables
  ADD COLUMN source_account_id INTEGER REFERENCES source_accounts(id);

CREATE INDEX payables_source_account_idx ON payables (source_account_id)
  WHERE source_account_id IS NOT NULL;

ALTER TABLE user_permissions
  ADD COLUMN source_accounts BOOLEAN NOT NULL DEFAULT FALSE;
