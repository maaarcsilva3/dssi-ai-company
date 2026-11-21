import { getSqlite, DB_PATH } from "../src/lib/db";

const sqlite = getSqlite();

sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matters (
  id TEXT PRIMARY KEY,
  matter_number TEXT NOT NULL UNIQUE,
  entity_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  title TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  counterparty TEXT NOT NULL,
  proponent_name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'Submitted',
  assignee_user_id TEXT,
  google_doc_url TEXT,
  system_of_record TEXT DEFAULT 'gdocs',
  effectivity_start TEXT,
  effectivity_end TEXT,
  expiry_bucket TEXT DEFAULT 'Unknown',
  physical_custody TEXT,
  custody_note TEXT,
  printed_copy_issued_at TEXT,
  latest_artifact_url TEXT,
  latest_artifact_label TEXT,
  on_hold_reason TEXT,
  submitted_by_user_id TEXT,
  internal_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  actor_user_id TEXT,
  actor_name TEXT,
  event_type TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  note TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matter_sequence (
  entity_code TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_matters_status ON matters(status);
CREATE INDEX IF NOT EXISTS idx_matters_dept ON matters(department_id);
CREATE INDEX IF NOT EXISTS idx_matters_expiry ON matters(expiry_bucket);
CREATE INDEX IF NOT EXISTS idx_audit_matter ON audit_events(matter_id);
`);

console.log(`Database ready at ${DB_PATH}`);