import { randomUUID } from "crypto";
import type { SQLInputValue } from "node:sqlite";
import { getSqlite } from "../src/lib/db";
import { computeExpiryBucket } from "../src/lib/matters/expiry";

const sqlite = getSqlite();

function iso(d?: Date) {
  return (d ?? new Date()).toISOString();
}

function dateStr(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

sqlite.exec(`DELETE FROM audit_events; DELETE FROM matters; DELETE FROM users; DELETE FROM departments; DELETE FROM entities; DELETE FROM matter_sequence;`);

const entityGbpi = randomUUID();
const entityNutrimax = randomUUID();
sqlite
  .prepare(`INSERT INTO entities (id, code, name) VALUES (?, 'GBPI', 'Gardenia Bakeries Philippines Inc.'), (?, 'NUTRIMAX', 'Nutrimax Foods Corp.')`)
  .run(entityGbpi, entityNutrimax);

const deptPurch = randomUUID();
const deptMktg = randomUUID();
sqlite
  .prepare(
    `INSERT INTO departments (id, entity_id, code, name) VALUES
     (?, ?, 'PURCH', 'Purchasing'),
     (?, ?, 'MKTG', 'Marketing'),
     (?, ?, 'PURCH', 'Purchasing')`
  )
  .run(deptPurch, entityGbpi, deptMktg, entityGbpi, randomUUID(), entityNutrimax);

const deptPurchNutri = sqlite
  .prepare(`SELECT id FROM departments WHERE entity_id = ? AND code = 'PURCH'`)
  .get(entityNutrimax) as { id: string };

const users = [
  { id: randomUUID(), email: "requester@gbpi.demo", name: "Ana Reyes", role: "requester", departmentId: deptPurch },
  { id: randomUUID(), email: "atty.jp@gbpi.demo", name: "Atty. Juan Pascual", role: "legal", departmentId: null },
  { id: randomUUID(), email: "assigner@gbpi.demo", name: "Maria Santos (Sr. Paralegal)", role: "assigner", departmentId: null },
  { id: randomUUID(), email: "manager@gbpi.demo", name: "Atty. Elena Cruz", role: "manager", departmentId: null },
];

const insertUser = sqlite.prepare(
  `INSERT INTO users (id, email, name, role, department_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`
);
for (const u of users) {
  insertUser.run(u.id, u.email, u.name, u.role, u.departmentId, iso());
}

const requester = users[0];
const legal = users[1];
const assigner = users[2];

const seedMatters: Array<Record<string, unknown>> = [
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
    gdoc: "https://docs.google.com/document/d/demo-flour",
  },
  {
    num: "GBPI-2026-0002",
    title: "Marketing agency MOA — Q2 campaign",
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
    gdoc: "https://docs.google.com/document/d/demo-moa",
  },
  {
    num: "GBPI-2026-0003",
    title: "Warehouse lease — Laguna hub",
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
    gdoc: null,
  },
  {
    num: "GBPI-2025-0044",
    title: "NDA — packaging vendor evaluation",
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
    gdoc: "https://docs.google.com/document/d/demo-nda",
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
    custody: "Physical: filed — Dept Purchasing",
    custodyNote: "Original in dept file",
    printed: iso(new Date("2025-08-01")),
    gdoc: null,
  },
  {
    num: "NUTRIMAX-2025-0007",
    title: "Distribution agreement — Visayas",
    type: "Distribution",
    party: "Visayas Food Traders",
    status: "Final Approval",
    dept: deptPurchNutri.id,
    entity: entityNutrimax,
    end: dateStr(60),
    assignee: legal.id,
    custody: "Physical: with Legal front desk",
    custodyNote: null,
    printed: iso(new Date("2025-11-01")),
    gdoc: "https://docs.google.com/document/d/demo-dist",
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
    onHold: "Awaiting Marketing budget approval",
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
    gdoc: null,
  },
];

const insertMatter = sqlite.prepare(`
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
insertMatter.setAllowBareNamedParameters(true);

const insertAudit = sqlite.prepare(`
INSERT INTO audit_events (id, matter_id, actor_user_id, actor_name, event_type, before_json, after_json, note, occurred_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const m of seedMatters) {
  const id = randomUUID();
  const end = m.end as string | null;
  const bucket = computeExpiryBucket(end);
  const ts = iso();
  const matterRow: Record<string, SQLInputValue> = {
    id,
    matter_number: m.num as string,
    entity_id: m.entity as string,
    department_id: m.dept as string,
    title: m.title as string,
    contract_type: m.type as string,
    counterparty: m.party as string,
    proponent_name: "Demo Proponent",
    priority: "normal",
    status: m.status as string,
    assignee_user_id: (m.assignee as string | null) ?? null,
    google_doc_url: (m.gdoc as string | null) ?? null,
    system_of_record: m.gdoc ? "gdocs" : "physical",
    effectivity_start: dateStr(-365),
    effectivity_end: end,
    expiry_bucket: bucket,
    physical_custody: (m.custody as string | null) ?? null,
    custody_note: (m.custodyNote as string | null) ?? null,
    printed_copy_issued_at: (m.printed as string | null) ?? null,
    latest_artifact_url: (m.gdoc as string | null) ?? null,
    latest_artifact_label: m.gdoc ? "Google Doc" : null,
    on_hold_reason: (m as { onHold?: string }).onHold ?? null,
    submitted_by_user_id: requester.id,
    internal_notes: null,
    created_at: ts,
    updated_at: ts,
  };
  insertMatter.run(matterRow);
  insertAudit.run(
    randomUUID(),
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
console.log("  Users:", users.map((u) => `  - ${u.email} (${u.role})`).join("\n"));
console.log(`  Matters: ${seedMatters.length}`);