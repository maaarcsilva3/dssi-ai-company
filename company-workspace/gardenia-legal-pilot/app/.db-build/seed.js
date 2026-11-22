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

// scripts/seed.ts
var import_crypto = require("crypto");

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

// src/lib/matters/expiry.ts
function computeExpiryBucket(endDate) {
  if (!endDate) return "Unknown";
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return "Unknown";
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  if (endDay < today) return "Expired";
  const in90 = new Date(today);
  in90.setDate(in90.getDate() + 90);
  if (endDay <= in90) return "NearExpiry";
  return "Active";
}

// scripts/seed.ts
var sqlite = getSqlite();
function iso(d) {
  return (d ?? /* @__PURE__ */ new Date()).toISOString();
}
function dateStr(offsetDays) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
sqlite.exec(`DELETE FROM audit_events; DELETE FROM matters; DELETE FROM users; DELETE FROM departments; DELETE FROM entities; DELETE FROM matter_sequence;`);
var entityGbpi = (0, import_crypto.randomUUID)();
var entityNutrimax = (0, import_crypto.randomUUID)();
sqlite.prepare(`INSERT INTO entities (id, code, name) VALUES (?, 'GBPI', 'Gardenia Bakeries Philippines Inc.'), (?, 'NUTRIMAX', 'Nutrimax Foods Corp.')`).run(entityGbpi, entityNutrimax);
var deptPurch = (0, import_crypto.randomUUID)();
var deptMktg = (0, import_crypto.randomUUID)();
sqlite.prepare(
  `INSERT INTO departments (id, entity_id, code, name) VALUES
     (?, ?, 'PURCH', 'Purchasing'),
     (?, ?, 'MKTG', 'Marketing'),
     (?, ?, 'PURCH', 'Purchasing')`
).run(deptPurch, entityGbpi, deptMktg, entityGbpi, (0, import_crypto.randomUUID)(), entityNutrimax);
var deptPurchNutri = sqlite.prepare(`SELECT id FROM departments WHERE entity_id = ? AND code = 'PURCH'`).get(entityNutrimax);
var users2 = [
  { id: (0, import_crypto.randomUUID)(), email: "requester@gbpi.demo", name: "Ana Reyes", role: "requester", departmentId: deptPurch },
  { id: (0, import_crypto.randomUUID)(), email: "atty.jp@gbpi.demo", name: "Atty. Juan Pascual", role: "legal", departmentId: null },
  { id: (0, import_crypto.randomUUID)(), email: "assigner@gbpi.demo", name: "Maria Santos (Sr. Paralegal)", role: "assigner", departmentId: null },
  { id: (0, import_crypto.randomUUID)(), email: "manager@gbpi.demo", name: "Atty. Elena Cruz", role: "manager", departmentId: null }
];
var insertUser = sqlite.prepare(
  `INSERT INTO users (id, email, name, role, department_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`
);
for (const u of users2) {
  insertUser.run(u.id, u.email, u.name, u.role, u.departmentId, iso());
}
var requester = users2[0];
var legal = users2[1];
var assigner = users2[2];
var seedMatters = [
  {
    num: "GBPI-2026-0001",
    title: "Flour supply agreement renewal",
    type: "Supply Agreement",
    party: "Universal Robina Corporation",
    status: "In Pool",
    dept: deptPurch,
    entity: entityGbpi,
    end: dateStr(120),
    assignee: null,
    custody: null,
    printed: null,
    gdoc: "https://docs.google.com/document/d/demo-flour"
  },
  {
    num: "GBPI-2026-0002",
    title: "Marketing agency MOA \u2014 Q2 campaign",
    type: "MOA",
    party: "Ace Saatchi & Saatchi",
    status: "Drafting",
    dept: deptMktg,
    entity: entityGbpi,
    end: dateStr(45),
    assignee: legal.id,
    custody: "Physical: with Atty. Juan Pascual",
    custodyNote: "Legal vault shelf B-12",
    printed: null,
    gdoc: "https://docs.google.com/document/d/demo-moa"
  },
  {
    num: "GBPI-2026-0003",
    title: "Warehouse lease \u2014 Laguna hub",
    type: "Lease",
    party: "Filinvest Land Inc.",
    status: "Assigned",
    dept: deptPurch,
    entity: entityGbpi,
    end: dateStr(25),
    assignee: legal.id,
    custody: "Physical: with Maria Santos",
    custodyNote: "Routing tray",
    printed: null,
    gdoc: null
  },
  {
    num: "GBPI-2025-0044",
    title: "NDA \u2014 packaging vendor evaluation",
    type: "NDA",
    party: "PackSmart Asia",
    status: "Internal Review",
    dept: deptPurch,
    entity: entityGbpi,
    end: dateStr(200),
    assignee: assigner.id,
    custody: "Physical: with Atty. Elena Cruz",
    custodyNote: "Pending wet signatures",
    printed: iso(new Date(dateStr(-5))),
    gdoc: "https://docs.google.com/document/d/demo-nda"
  },
  {
    num: "GBPI-2025-0038",
    title: "Equipment maintenance SA",
    type: "Service Agreement",
    party: "TechServe Philippines",
    status: "Completed",
    dept: deptPurch,
    entity: entityGbpi,
    end: dateStr(-30),
    assignee: legal.id,
    custody: "Physical: filed \u2014 Dept Purchasing",
    custodyNote: "Original in dept file",
    printed: iso(/* @__PURE__ */ new Date("2025-08-01")),
    gdoc: null
  },
  {
    num: "NUTRIMAX-2025-0007",
    title: "Distribution agreement \u2014 Visayas",
    type: "Distribution",
    party: "Visayas Food Traders",
    status: "Final Approval",
    dept: deptPurchNutri.id,
    entity: entityNutrimax,
    end: dateStr(60),
    assignee: legal.id,
    custody: "Physical: with Legal front desk",
    custodyNote: null,
    printed: iso(/* @__PURE__ */ new Date("2025-11-01")),
    gdoc: "https://docs.google.com/document/d/demo-dist"
  },
  {
    num: "GBPI-2025-0050",
    title: "Brand ambassador contract",
    type: "Talent Agreement",
    party: "Celebrity Talent Co.",
    status: "On Hold",
    dept: deptMktg,
    entity: entityGbpi,
    end: null,
    assignee: legal.id,
    custody: null,
    custodyNote: null,
    printed: null,
    gdoc: "https://docs.google.com/document/d/demo-talent",
    onHold: "Awaiting Marketing budget approval"
  },
  {
    num: "GBPI-2024-0099",
    title: "Legacy logistics contract (archive)",
    type: "Logistics",
    party: "2GO Group",
    status: "Completed",
    dept: deptPurch,
    entity: entityGbpi,
    end: dateStr(15),
    assignee: legal.id,
    custody: "Physical: archive room",
    custodyNote: null,
    printed: null,
    gdoc: null
  }
];
var insertMatter = sqlite.prepare(`
INSERT INTO matters (
  id, matter_number, entity_id, department_id, title, contract_type, counterparty,
  proponent_name, priority, status, assignee_user_id, google_doc_url, system_of_record,
  effectivity_start, effectivity_end, expiry_bucket, physical_custody, custody_note,
  printed_copy_issued_at, latest_artifact_url, latest_artifact_label, on_hold_reason,
  submitted_by_user_id, internal_notes, created_at, updated_at
) VALUES (
  @id, @matter_number, @entity_id, @department_id, @title, @contract_type, @counterparty,
  @proponent_name, @priority, @status, @assignee_user_id, @google_doc_url, @system_of_record,
  @effectivity_start, @effectivity_end, @expiry_bucket, @physical_custody, @custody_note,
  @printed_copy_issued_at, @latest_artifact_url, @latest_artifact_label, @on_hold_reason,
  @submitted_by_user_id, @internal_notes, @created_at, @updated_at
)`);
var insertAudit = sqlite.prepare(`
INSERT INTO audit_events (id, matter_id, actor_user_id, actor_name, event_type, before_json, after_json, note, occurred_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const m of seedMatters) {
  const id = (0, import_crypto.randomUUID)();
  const end = m.end;
  const bucket = computeExpiryBucket(end);
  const ts = iso();
  insertMatter.run({
    id,
    matter_number: m.num,
    entity_id: m.entity,
    department_id: m.dept,
    title: m.title,
    contract_type: m.type,
    counterparty: m.party,
    proponent_name: "Demo Proponent",
    priority: "normal",
    status: m.status,
    assignee_user_id: m.assignee,
    google_doc_url: m.gdoc,
    system_of_record: m.gdoc ? "gdocs" : "physical",
    effectivity_start: dateStr(-365),
    effectivity_end: end,
    expiry_bucket: bucket,
    physical_custody: m.custody,
    custody_note: m.custodyNote ?? null,
    printed_copy_issued_at: m.printed,
    latest_artifact_url: m.gdoc,
    latest_artifact_label: m.gdoc ? "Google Doc" : null,
    on_hold_reason: m.onHold ?? null,
    submitted_by_user_id: requester.id,
    internal_notes: null,
    created_at: ts,
    updated_at: ts
  });
  insertAudit.run(
    (0, import_crypto.randomUUID)(),
    id,
    requester.id,
    requester.name,
    "intake_submitted",
    null,
    JSON.stringify({ matterNumber: m.num }),
    null,
    ts
  );
}
sqlite.prepare(`INSERT INTO matter_sequence (entity_code, year, last_number) VALUES ('GBPI', 2026, 2), ('NUTRIMAX', 2025, 7)`).run();
console.log("Seed complete:");
console.log("  Entities: GBPI, Nutrimax");
console.log("  Users:", users2.map((u) => `  - ${u.email} (${u.role})`).join("\n"));
console.log(`  Matters: ${seedMatters.length}`);
