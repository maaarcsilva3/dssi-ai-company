-- AP workflow expansion: statuses, drafts, invoice uniqueness, check date,
-- status permissions, notifications, liquidation, truck allowances.

-- ---------------------------------------------------------------------------
-- 1. Payable statuses are seeded in 003 / reconciled in 026_default_seed_data.sql
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 2. Payables: draft, check_date, created_by
-- ---------------------------------------------------------------------------
ALTER TABLE payables
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS check_date DATE,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS payables_is_draft_idx ON payables (is_draft);
CREATE INDEX IF NOT EXISTS payables_check_date_idx ON payables (check_date);

-- Mirror on receivables so the shared ledger writer stays aligned
ALTER TABLE receivables
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS check_date DATE,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- ---------------------------------------------------------------------------
-- 3. Invoice lines: per-line term + due date; unique invoice numbers
-- ---------------------------------------------------------------------------
ALTER TABLE payable_invoices
  ADD COLUMN IF NOT EXISTS payment_term_id INTEGER REFERENCES payment_terms(id),
  ADD COLUMN IF NOT EXISTS due_date DATE;

ALTER TABLE receivable_invoices
  ADD COLUMN IF NOT EXISTS payment_term_id INTEGER REFERENCES payment_terms(id),
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- Unique non-blank invoice numbers (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS payable_invoices_invoice_no_uq
  ON payable_invoices (lower(trim(invoice_no)))
  WHERE invoice_no IS NOT NULL AND trim(invoice_no) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS receivable_invoices_invoice_no_uq
  ON receivable_invoices (lower(trim(invoice_no)))
  WHERE invoice_no IS NOT NULL AND trim(invoice_no) <> '';

-- Unique fuel delivery receipts
CREATE UNIQUE INDEX IF NOT EXISTS payables_fuel_delivery_receipt_uq
  ON payables (lower(trim(fuel_delivery_receipt)))
  WHERE fuel_delivery_receipt IS NOT NULL AND trim(fuel_delivery_receipt) <> '';

-- ---------------------------------------------------------------------------
-- 4. Status history: who changed + check_date
-- ---------------------------------------------------------------------------
ALTER TABLE payable_status_history
  ADD COLUMN IF NOT EXISTS changed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS check_date DATE;

ALTER TABLE receivable_status_history
  ADD COLUMN IF NOT EXISTS changed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS check_date DATE;

-- ---------------------------------------------------------------------------
-- 5. Per-user which payable statuses they may set
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_payable_status_permissions (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status_id INTEGER NOT NULL REFERENCES payable_statuses(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, status_id)
);

CREATE INDEX IF NOT EXISTS user_payable_status_permissions_status_idx
  ON user_payable_status_permissions (status_id);

-- ---------------------------------------------------------------------------
-- 6. Permissions for new modules
-- ---------------------------------------------------------------------------
ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS liquidations_view BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS liquidations_manage BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS petty_cash_view BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS petty_cash_manage BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- 7. In-app notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 8. Liquidations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS liquidations (
  id                SERIAL PRIMARY KEY,
  payee_name        TEXT NOT NULL,
  assigned_to       INTEGER REFERENCES users(id),
  created_by        INTEGER REFERENCES users(id),
  source_account_id INTEGER REFERENCES source_accounts(id),
  advance_amount    NUMERIC(14, 2) NOT NULL CHECK (advance_amount > 0),
  advance_date      DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'partial', 'closed')),
  remarks           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER liquidations_updated_at
  BEFORE UPDATE ON liquidations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS liquidations_assigned_to_idx ON liquidations (assigned_to);
CREATE INDEX IF NOT EXISTS liquidations_status_idx ON liquidations (status);
CREATE INDEX IF NOT EXISTS liquidations_advance_date_idx ON liquidations (advance_date);

CREATE TABLE IF NOT EXISTS liquidation_lines (
  id              SERIAL PRIMARY KEY,
  liquidation_id  INTEGER NOT NULL REFERENCES liquidations(id) ON DELETE CASCADE,
  line_date       DATE NOT NULL,
  description     TEXT NOT NULL,
  amount          NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS liquidation_lines_liquidation_id_idx
  ON liquidation_lines (liquidation_id);

-- ---------------------------------------------------------------------------
-- 9. Petty cash / truck allowances
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS truck_allowances (
  id                SERIAL PRIMARY KEY,
  truck_id          TEXT NOT NULL,
  allowance_date    DATE NOT NULL,
  period_month      DATE NOT NULL, -- first day of month
  amount            NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  payee_name        TEXT,
  remarks           TEXT,
  source_account_id INTEGER REFERENCES source_accounts(id),
  created_by        INTEGER REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER truck_allowances_updated_at
  BEFORE UPDATE ON truck_allowances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS truck_allowances_period_month_idx ON truck_allowances (period_month);
CREATE INDEX IF NOT EXISTS truck_allowances_truck_id_idx ON truck_allowances (lower(truck_id));
