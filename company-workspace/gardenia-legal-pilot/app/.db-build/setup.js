"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/lib/db/index.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_better_sqlite32 = require("drizzle-orm/better-sqlite3");

// src/lib/db/schema.ts
var import_sqlite_core = require("drizzle-orm/sqlite-core");
var users = (0, import_sqlite_core.sqliteTable)("users", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  email: (0, import_sqlite_core.text)("email").notNull().unique(),
  name: (0, import_sqlite_core.text)("name").notNull(),
  role: (0, import_sqlite_core.text)("role").notNull(),
  // requester | legal | assigner | manager | admin
  departmentId: (0, import_sqlite_core.text)("department_id"),
  createdAt: (0, import_sqlite_core.text)("created_at").notNull()
});
var entities = (0, import_sqlite_core.sqliteTable)("entities", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  code: (0, import_sqlite_core.text)("code").notNull(),
  name: (0, import_sqlite_core.text)("name").notNull()
});
var departments = (0, import_sqlite_core.sqliteTable)("departments", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  entityId: (0, import_sqlite_core.text)("entity_id").notNull(),
  code: (0, import_sqlite_core.text)("code").notNull(),
  name: (0, import_sqlite_core.text)("name").notNull()
});
var matters = (0, import_sqlite_core.sqliteTable)("matters", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  matterNumber: (0, import_sqlite_core.text)("matter_number").notNull().unique(),
  entityId: (0, import_sqlite_core.text)("entity_id").notNull(),
  departmentId: (0, import_sqlite_core.text)("department_id").notNull(),
  title: (0, import_sqlite_core.text)("title").notNull(),
  contractType: (0, import_sqlite_core.text)("contract_type").notNull(),
  counterparty: (0, import_sqlite_core.text)("counterparty").notNull(),
  proponentName: (0, import_sqlite_core.text)("proponent_name").notNull(),
  priority: (0, import_sqlite_core.text)("priority").notNull().default("normal"),
  status: (0, import_sqlite_core.text)("status").notNull().default("Submitted"),
  assigneeUserId: (0, import_sqlite_core.text)("assignee_user_id"),
  googleDocUrl: (0, import_sqlite_core.text)("google_doc_url"),
  systemOfRecord: (0, import_sqlite_core.text)("system_of_record").default("gdocs"),
  effectivityStart: (0, import_sqlite_core.text)("effectivity_start"),
  effectivityEnd: (0, import_sqlite_core.text)("effectivity_end"),
  expiryBucket: (0, import_sqlite_core.text)("expiry_bucket").default("Unknown"),
  physicalCustody: (0, import_sqlite_core.text)("physical_custody"),
  custodyNote: (0, import_sqlite_core.text)("custody_note"),
  printedCopyIssuedAt: (0, import_sqlite_core.text)("printed_copy_issued_at"),
  latestArtifactUrl: (0, import_sqlite_core.text)("latest_artifact_url"),
  latestArtifactLabel: (0, import_sqlite_core.text)("latest_artifact_label"),
  onHoldReason: (0, import_sqlite_core.text)("on_hold_reason"),
  submittedByUserId: (0, import_sqlite_core.text)("submitted_by_user_id"),
  internalNotes: (0, import_sqlite_core.text)("internal_notes"),
  createdAt: (0, import_sqlite_core.text)("created_at").notNull(),
  updatedAt: (0, import_sqlite_core.text)("updated_at").notNull()
});
var auditEvents = (0, import_sqlite_core.sqliteTable)("audit_events", {
  id: (0, import_sqlite_core.text)("id").primaryKey(),
  matterId: (0, import_sqlite_core.text)("matter_id").notNull(),
  actorUserId: (0, import_sqlite_core.text)("actor_user_id"),
  actorName: (0, import_sqlite_core.text)("actor_name"),
  eventType: (0, import_sqlite_core.text)("event_type").notNull(),
  beforeJson: (0, import_sqlite_core.text)("before_json"),
  afterJson: (0, import_sqlite_core.text)("after_json"),
  note: (0, import_sqlite_core.text)("note"),
  occurredAt: (0, import_sqlite_core.text)("occurred_at").notNull()
});
var matterSequence = (0, import_sqlite_core.sqliteTable)("matter_sequence", {
  entityCode: (0, import_sqlite_core.text)("entity_code").primaryKey(),
  year: (0, import_sqlite_core.integer)("year").notNull(),
  lastNumber: (0, import_sqlite_core.integer)("last_number").notNull().default(0)
});

// src/lib/db/index.ts
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var DB_PATH = process.env.DATABASE_PATH || import_path.default.join(process.cwd(), "data", "gardenia.db");
var DATA_DIR = import_path.default.dirname(DB_PATH);
var _sqlite = null;
function getSqlite() {
  if (!_sqlite) {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
    _sqlite = new import_better_sqlite3.default(DB_PATH);
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("foreign_keys = ON");
  }
  return _sqlite;
}

// scripts/setup.ts
var sqlite = getSqlite();
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
