-- Accounts receivable: customers, documents, and incoming deposits.
-- Status categories match payables (open / paid / cancelled). "Expected" reserves a deposit.

CREATE TABLE customers (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  tin             TEXT,
  contact         TEXT,
  address         TEXT,
  bank_details    TEXT,
  payment_term_id INTEGER REFERENCES payment_terms(id),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_name_uq ON customers (lower(name));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE receivable_statuses (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('open', 'paid', 'cancelled')),
  color      TEXT NOT NULL DEFAULT '#6b7280' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX receivable_statuses_name_uq ON receivable_statuses (lower(name));
CREATE TRIGGER receivable_statuses_updated_at BEFORE UPDATE ON receivable_statuses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO receivable_statuses (name, category, color, sort_order) VALUES
  ('Outstanding', 'open', '#b91c1c', 10),
  ('Expected', 'open', '#1d4ed8', 20),
  ('Collected', 'paid', '#047857', 30),
  ('Cancelled', 'cancelled', '#4b5563', 40);

CREATE TABLE receivables (
  id                SERIAL PRIMARY KEY,
  client_id         INTEGER NOT NULL REFERENCES customers(id),
  payment_type_id   INTEGER NOT NULL REFERENCES payment_types(id),
  payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id),
  payment_term_id   INTEGER REFERENCES payment_terms(id),
  invoice_no        TEXT,
  invoice_date      DATE,
  due_date          DATE NOT NULL,
  amount            NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  gross_amount      NUMERIC(14, 2) NOT NULL,
  apply_vat         BOOLEAN NOT NULL DEFAULT FALSE,
  vat_rate          NUMERIC(5, 2) NOT NULL DEFAULT 12,
  vat_amount        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  apply_ewt         BOOLEAN NOT NULL DEFAULT FALSE,
  ewt_kind          TEXT CHECK (ewt_kind IS NULL OR ewt_kind IN ('products', 'service')),
  ewt_rate          NUMERIC(5, 2),
  ewt_amount        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  description       TEXT,
  status_id         INTEGER NOT NULL REFERENCES receivable_statuses(id),
  paid_at           DATE,
  payment_reference TEXT,
  assigned_to       INTEGER REFERENCES users(id),
  source_account_id INTEGER REFERENCES source_accounts(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX receivables_client_idx ON receivables (client_id);
CREATE INDEX receivables_due_idx ON receivables (due_date);
CREATE INDEX receivables_status_idx ON receivables (status_id);
CREATE INDEX receivables_assigned_to_idx ON receivables (assigned_to);
CREATE INDEX receivables_source_account_idx ON receivables (source_account_id)
  WHERE source_account_id IS NOT NULL;
CREATE TRIGGER receivables_updated_at BEFORE UPDATE ON receivables
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE receivable_invoices (
  id            SERIAL PRIMARY KEY,
  receivable_id INTEGER NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  invoice_no    TEXT,
  invoice_date  DATE,
  gross_amount  NUMERIC(14, 2) NOT NULL CHECK (gross_amount > 0),
  vat_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ewt_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_amount    NUMERIC(14, 2) NOT NULL CHECK (net_amount > 0),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX receivable_invoices_receivable_id_idx ON receivable_invoices (receivable_id);

CREATE TABLE receivable_status_history (
  id                SERIAL PRIMARY KEY,
  receivable_id     INTEGER NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  from_status_id    INTEGER REFERENCES receivable_statuses(id),
  to_status_id      INTEGER NOT NULL REFERENCES receivable_statuses(id),
  remarks           TEXT,
  payment_reference TEXT,
  paid_at           DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX receivable_status_history_receivable_id_idx
  ON receivable_status_history (receivable_id, created_at DESC);

ALTER TABLE attachments ALTER COLUMN payable_id DROP NOT NULL;
ALTER TABLE attachments
  ADD COLUMN receivable_id INTEGER REFERENCES receivables(id) ON DELETE CASCADE;
ALTER TABLE attachments
  ADD CONSTRAINT attachments_one_parent CHECK (
    (payable_id IS NOT NULL)::int + (receivable_id IS NOT NULL)::int = 1
  );
CREATE INDEX attachments_receivable_idx ON attachments (receivable_id)
  WHERE receivable_id IS NOT NULL;

ALTER TABLE source_account_transactions
  ADD COLUMN receivable_id INTEGER REFERENCES receivables(id) ON DELETE SET NULL;
ALTER TABLE source_account_transactions
  ADD CONSTRAINT source_txn_one_document CHECK (payable_id IS NULL OR receivable_id IS NULL);
CREATE INDEX source_account_transactions_receivable_idx
  ON source_account_transactions (receivable_id)
  WHERE receivable_id IS NOT NULL;

ALTER TABLE user_permissions
  ADD COLUMN receivables_view BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN receivables_create BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN receivables_edit BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN receivables_delete BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN receivables_status BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN upcoming_collection BOOLEAN NOT NULL DEFAULT FALSE;
