CREATE TYPE payable_status AS ENUM ('unpaid', 'scheduled', 'paid', 'cancelled');

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE clients (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  tin          TEXT,
  contact      TEXT,
  address      TEXT,
  bank_details TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX clients_name_uq ON clients (lower(name));

CREATE TABLE payment_types (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payment_types_name_uq ON payment_types (lower(name));

CREATE TABLE payment_methods (
  id                 SERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  requires_reference BOOLEAN NOT NULL DEFAULT FALSE,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payment_methods_name_uq ON payment_methods (lower(name));

CREATE TABLE payment_terms (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  days       INTEGER NOT NULL DEFAULT 0 CHECK (days >= 0),
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payment_terms_name_uq ON payment_terms (lower(name));

CREATE TABLE payables (
  id                SERIAL PRIMARY KEY,
  client_id         INTEGER NOT NULL REFERENCES clients(id),
  payment_type_id   INTEGER NOT NULL REFERENCES payment_types(id),
  payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id),
  payment_term_id   INTEGER REFERENCES payment_terms(id),
  invoice_no        TEXT,
  invoice_date      DATE,
  due_date          DATE NOT NULL,
  amount            NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency          CHAR(3) NOT NULL DEFAULT 'PHP',
  description       TEXT,
  status            payable_status NOT NULL DEFAULT 'unpaid',
  paid_at           DATE,
  payment_reference TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payables_status_due_idx ON payables (status, due_date);
CREATE INDEX payables_client_idx ON payables (client_id);

CREATE TABLE attachments (
  id            SERIAL PRIMARY KEY,
  payable_id    INTEGER NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name   TEXT NOT NULL UNIQUE,
  mime          TEXT NOT NULL,
  size          INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX attachments_payable_idx ON attachments (payable_id);

-- Release schedule defaults: Friday (5), 7 days before, 0 after, Asia/Manila.
CREATE TABLE settings (
  id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  release_weekday SMALLINT NOT NULL DEFAULT 5 CHECK (release_weekday BETWEEN 0 AND 6),
  days_before     INTEGER NOT NULL DEFAULT 7 CHECK (days_before >= 0),
  days_after      INTEGER NOT NULL DEFAULT 0 CHECK (days_after >= 0),
  include_overdue BOOLEAN NOT NULL DEFAULT TRUE,
  timezone        TEXT NOT NULL DEFAULT 'Asia/Manila',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payment_types_updated_at BEFORE UPDATE ON payment_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payment_terms_updated_at BEFORE UPDATE ON payment_terms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER payables_updated_at BEFORE UPDATE ON payables FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO settings (id, release_weekday, days_before, days_after, include_overdue, timezone)
VALUES (1, 5, 7, 0, TRUE, 'Asia/Manila');

INSERT INTO payment_methods (name, requires_reference) VALUES
  ('Bank Deposit', TRUE),
  ('Bank Transfer', TRUE),
  ('Cash', FALSE),
  ('Check', TRUE),
  ('Post Dated Check', TRUE),
  ('Online / E-Wallet', TRUE);

INSERT INTO payment_terms (name, days) VALUES
  ('Immediate', 0),
  ('7', 7),
  ('15', 15),
  ('30', 30),
  ('45', 45),
  ('60', 60),
  ('90', 90);

INSERT INTO payment_types (name) VALUES
  ('Fuel'),
  ('Services'),
  ('Supplies'),
  ('Others');
