-- Users, per-staff permissions, and payable assignment.

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_username_uq ON users (lower(username));
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_permissions (
  user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payables_view     BOOLEAN NOT NULL DEFAULT FALSE,
  payables_create   BOOLEAN NOT NULL DEFAULT FALSE,
  payables_edit     BOOLEAN NOT NULL DEFAULT FALSE,
  payables_delete   BOOLEAN NOT NULL DEFAULT FALSE,
  payables_status   BOOLEAN NOT NULL DEFAULT FALSE,
  upcoming_release  BOOLEAN NOT NULL DEFAULT FALSE,
  masterdata        BOOLEAN NOT NULL DEFAULT FALSE,
  settings          BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE payables
  ADD COLUMN assigned_to INTEGER REFERENCES users(id);

CREATE INDEX payables_assigned_to_idx ON payables (assigned_to);

-- Default admin: username admin / password admin123 (change after first login).
INSERT INTO users (username, display_name, password_hash, role)
VALUES (
  'admin',
  'Administrator',
  '$2b$10$brKK1y/o8v03GuDNaJfOLumqQ.JCzA2GtRqNI/WkMqMN7eHLP4uIu',
  'admin'
);
