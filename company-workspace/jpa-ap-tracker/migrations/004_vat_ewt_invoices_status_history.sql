-- VAT / EWT fields on payables (amount remains the net payable).
ALTER TABLE payables
  ADD COLUMN gross_amount NUMERIC(14, 2),
  ADD COLUMN apply_vat BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 12,
  ADD COLUMN vat_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN apply_ewt BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN ewt_kind TEXT CHECK (ewt_kind IS NULL OR ewt_kind IN ('products', 'service')),
  ADD COLUMN ewt_rate NUMERIC(5, 2),
  ADD COLUMN ewt_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

UPDATE payables SET gross_amount = amount WHERE gross_amount IS NULL;
ALTER TABLE payables ALTER COLUMN gross_amount SET NOT NULL;

-- Multiple invoice lines under one payable (optional; single-invoice payables may have 0 or 1 rows).
CREATE TABLE payable_invoices (
  id            SERIAL PRIMARY KEY,
  payable_id    INTEGER NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
  invoice_no    TEXT,
  invoice_date  DATE,
  gross_amount  NUMERIC(14, 2) NOT NULL CHECK (gross_amount > 0),
  vat_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ewt_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_amount    NUMERIC(14, 2) NOT NULL CHECK (net_amount > 0),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payable_invoices_payable_id_idx ON payable_invoices (payable_id);

-- Backfill one invoice line from existing header fields where an invoice number or date exists.
INSERT INTO payable_invoices (payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount, sort_order)
SELECT id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, amount, 0
  FROM payables
 WHERE invoice_no IS NOT NULL OR invoice_date IS NOT NULL;

-- Status change audit trail with remarks.
CREATE TABLE payable_status_history (
  id                  SERIAL PRIMARY KEY,
  payable_id          INTEGER NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
  from_status_id      INTEGER REFERENCES payable_statuses(id),
  to_status_id        INTEGER NOT NULL REFERENCES payable_statuses(id),
  remarks             TEXT,
  payment_reference   TEXT,
  paid_at             DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payable_status_history_payable_id_idx ON payable_status_history (payable_id, created_at DESC);
