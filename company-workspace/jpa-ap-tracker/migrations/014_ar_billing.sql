-- Logistics billing AR (replaces shared receivable UI; legacy receivable tables kept unused).

ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS ar_view BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ar_edit BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ar_clients_manage BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS ar_clients (
  id                          SERIAL PRIMARY KEY,
  name                        TEXT NOT NULL,
  tin                         TEXT,
  address                     TEXT,
  contact                     TEXT,
  default_trip_classification TEXT
    CHECK (default_trip_classification IS NULL
      OR default_trip_classification IN ('FORWARD HAUL', 'BACK HAUL')),
  active                      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ar_clients_name_uq ON ar_clients (lower(trim(name)));
CREATE TRIGGER ar_clients_updated_at
  BEFORE UPDATE ON ar_clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ar_summaries (
  id                      SERIAL PRIMARY KEY,
  invoice_no              TEXT NOT NULL,
  client_id               INTEGER NOT NULL REFERENCES ar_clients(id),
  billing_reference       TEXT,
  trip_type               TEXT
    CHECK (trip_type IS NULL OR trip_type IN ('IIS', 'LUZON', 'CROSSDOCK')),
  trip_classification     TEXT
    CHECK (trip_classification IS NULL
      OR trip_classification IN ('FORWARD HAUL', 'BACK HAUL')),
  fleet_type              TEXT
    CHECK (fleet_type IS NULL OR fleet_type IN ('10W', '6W')),
  service_type            TEXT
    CHECK (service_type IS NULL OR service_type IN ('ON-CALL', 'WETLEASE')),
  coverage_start          DATE,
  coverage_end            DATE,
  invoice_date            DATE,
  total_sales_vatex       NUMERIC(14, 2) NOT NULL DEFAULT 0,
  vat_amount              NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_sales_vatinc      NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ewt_amount              NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_after_ewt         NUMERIC(14, 2) NOT NULL DEFAULT 0,
  deductions_total        NUMERIC(14, 2) NOT NULL DEFAULT 0,
  grand_total             NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ewt_2307_status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (ewt_2307_status IN ('pending', 'submitted')),
  ewt_2307_submitted_at   DATE,
  created_by              INTEGER REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ar_summaries_invoice_no_uq
  ON ar_summaries (lower(trim(invoice_no)));
CREATE INDEX IF NOT EXISTS ar_summaries_client_id_idx ON ar_summaries (client_id);
CREATE INDEX IF NOT EXISTS ar_summaries_invoice_date_idx ON ar_summaries (invoice_date);
CREATE INDEX IF NOT EXISTS ar_summaries_coverage_idx ON ar_summaries (coverage_start, coverage_end);
CREATE TRIGGER ar_summaries_updated_at
  BEFORE UPDATE ON ar_summaries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ar_detail_entries (
  id           SERIAL PRIMARY KEY,
  summary_id   INTEGER NOT NULL REFERENCES ar_summaries(id) ON DELETE CASCADE,
  invoice_no   TEXT NOT NULL,
  entry_date   DATE NOT NULL,
  reference    TEXT,
  origin       TEXT,
  destination  TEXT,
  amount       NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ar_detail_entries_summary_id_idx ON ar_detail_entries (summary_id);
CREATE INDEX IF NOT EXISTS ar_detail_entries_invoice_no_idx ON ar_detail_entries (lower(trim(invoice_no)));
CREATE INDEX IF NOT EXISTS ar_detail_entries_entry_date_idx ON ar_detail_entries (entry_date);

CREATE TABLE IF NOT EXISTS ar_deductions (
  id           SERIAL PRIMARY KEY,
  summary_id   INTEGER NOT NULL REFERENCES ar_summaries(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  amount       NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ar_deductions_summary_id_idx ON ar_deductions (summary_id);
