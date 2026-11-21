import { eq, and, or, like, desc, inArray } from "drizzle-orm";
import { getDb, getSqlite } from "../db";
import { matters, auditEvents, users, entities, departments, matterSequence } from "../db/schema";
import type { Matter } from "../db/schema";
import { canTransition } from "./status-machine";
import { computeExpiryBucket } from "./expiry";
import { sendEmailStub } from "../email/stub";
import { randomUUID } from "crypto";

function nowIso() {
  return new Date().toISOString();
}

export function nextMatterNumber(entityCode: string): string {
  const sqlite = getSqlite();
  const year = new Date().getFullYear();
  const row = sqlite
    .prepare(
      `SELECT last_number FROM matter_sequence WHERE entity_code = ? AND year = ?`
    )
    .get(entityCode, year) as { last_number: number } | undefined;
  const next = (row?.last_number ?? 0) + 1;
  sqlite
    .prepare(
      `INSERT INTO matter_sequence (entity_code, year, last_number) VALUES (?, ?, ?)
       ON CONFLICT(entity_code) DO UPDATE SET last_number = ?, year = ?`
    )
    .run(entityCode, year, next, next, year);
  return `${entityCode}-${year}-${String(next).padStart(4, "0")}`;
}

export function addAudit(
  matterId: string,
  actor: { id?: string; name?: string },
  eventType: string,
  before: unknown,
  after: unknown,
  note?: string
) {
  const db = getDb();
  db.insert(auditEvents).values({
    id: randomUUID(),
    matterId,
    actorUserId: actor.id ?? null,
    actorName: actor.name ?? "System",
    eventType,
    beforeJson: before ? JSON.stringify(before) : null,
    afterJson: after ? JSON.stringify(after) : null,
    note: note ?? null,
    occurredAt: nowIso(),
  }).run();
}

export function createIntake(input: {
  entityId: string;
  departmentId: string;
  title: string;
  contractType: string;
  counterparty: string;
  proponentName: string;
  priority: string;
  googleDocUrl?: string;
  internalNotes?: string;
  submittedBy: { id: string; name: string; email: string };
}) {
  const db = getDb();
  const entity = db.select().from(entities).where(eq(entities.id, input.entityId)).get();
  if (!entity) throw new Error("Entity not found");
  const matterNumber = nextMatterNumber(entity.code);
  const id = randomUUID();
  const ts = nowIso();
  const matter = {
    id,
    matterNumber,
    entityId: input.entityId,
    departmentId: input.departmentId,
    title: input.title,
    contractType: input.contractType,
    counterparty: input.counterparty,
    proponentName: input.proponentName,
    priority: input.priority,
    status: "Submitted",
    assigneeUserId: null,
    googleDocUrl: input.googleDocUrl ?? null,
    systemOfRecord: "gdocs",
    effectivityStart: null,
    effectivityEnd: null,
    expiryBucket: "Unknown",
    physicalCustody: null,
    custodyNote: null,
    printedCopyIssuedAt: null,
    latestArtifactUrl: input.googleDocUrl ?? null,
    latestArtifactLabel: input.googleDocUrl ? "Google Doc (draft)" : null,
    onHoldReason: null,
    submittedByUserId: input.submittedBy.id,
    internalNotes: input.internalNotes ?? null,
    createdAt: ts,
    updatedAt: ts,
  };
  db.insert(matters).values(matter).run();
  addAudit(id, input.submittedBy, "intake_submitted", null, { matterNumber, status: "Submitted" });
  // Auto move to In Pool within same transaction
  db.update(matters)
    .set({ status: "In Pool", updatedAt: nowIso() })
    .where(eq(matters.id, id))
    .run();
  addAudit(id, { name: "System" }, "status_change", { status: "Submitted" }, { status: "In Pool" });
  sendEmailStub({
    to: input.submittedBy.email,
    subject: `Contract request received — ${matterNumber}`,
    body: `Your request "${input.title}" was received. Matter ID: ${matterNumber}. Status: In Pool (awaiting Legal assignment).`,
  });
  return { ...matter, status: "In Pool" };
}

export function getMatterById(id: string): Matter | undefined {
  return getDb().select().from(matters).where(eq(matters.id, id)).get();
}

export function listAudit(matterId: string, limit = 50) {
  return getDb()
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.matterId, matterId))
    .orderBy(desc(auditEvents.occurredAt))
    .limit(limit)
    .all();
}

export function claimMatter(matterId: string, user: { id: string; name: string }) {
  const db = getDb();
  const matter = getMatterById(matterId);
  if (!matter) throw new Error("Matter not found");
  if (matter.status !== "In Pool") throw new Error("Only matters In Pool can be claimed");
  const before = { status: matter.status, assignee: matter.assigneeUserId };
  db.update(matters)
    .set({
      status: "Assigned",
      assigneeUserId: user.id,
      updatedAt: nowIso(),
    })
    .where(eq(matters.id, matterId))
    .run();
  addAudit(matterId, user, "assignment", before, { status: "Assigned", assignee: user.id, source: "claim" });
  addAudit(matterId, user, "status_change", { status: "In Pool" }, { status: "Assigned" });
}

export function assignMatter(matterId: string, assigneeId: string, actor: { id: string; name: string }) {
  const db = getDb();
  const matter = getMatterById(matterId);
  if (!matter) throw new Error("Matter not found");
  if (matter.status !== "In Pool") throw new Error("Only matters In Pool can be assigned");
  const assignee = db.select().from(users).where(eq(users.id, assigneeId)).get();
  if (!assignee) throw new Error("Assignee not found");
  db.update(matters)
    .set({
      status: "Assigned",
      assigneeUserId: assigneeId,
      updatedAt: nowIso(),
    })
    .where(eq(matters.id, matterId))
    .run();
  addAudit(matterId, actor, "assignment", null, {
    assignee: assigneeId,
    assigneeName: assignee.name,
    source: "manual",
  });
  addAudit(matterId, actor, "status_change", { status: matter.status }, { status: "Assigned" });
}

export function transitionStatus(
  matterId: string,
  toStatus: string,
  actor: { id: string; name: string },
  onHoldReason?: string
) {
  const db = getDb();
  const matter = getMatterById(matterId);
  if (!matter) throw new Error("Matter not found");
  const check = canTransition(matter.status, toStatus, {
    printedCopyIssued: !!matter.printedCopyIssuedAt,
    onHoldReason,
  });
  if (!check.ok) {
    const err = new Error(check.error);
    (err as Error & { statusCode: number }).statusCode = 409;
    throw err;
  }
  const before = { status: matter.status, onHoldReason: matter.onHoldReason };
  db.update(matters)
    .set({
      status: toStatus,
      onHoldReason: toStatus === "On Hold" ? onHoldReason ?? null : null,
      updatedAt: nowIso(),
    })
    .where(eq(matters.id, matterId))
    .run();
  addAudit(matterId, actor, "status_change", before, { status: toStatus, onHoldReason });
  const submitter = matter.submittedByUserId
    ? db.select().from(users).where(eq(users.id, matter.submittedByUserId)).get()
    : null;
  if (submitter?.email) {
    sendEmailStub({
      to: submitter.email,
      subject: `Status update — ${matter.matterNumber}`,
      body: `Your contract "${matter.title}" is now: ${toStatus}.`,
    });
  }
}

export function updateCustody(
  matterId: string,
  physicalCustody: string,
  custodyNote: string,
  actor: { id: string; name: string }
) {
  const db = getDb();
  const matter = getMatterById(matterId);
  if (!matter) throw new Error("Matter not found");
  const before = { physicalCustody: matter.physicalCustody, custodyNote: matter.custodyNote };
  db.update(matters)
    .set({ physicalCustody, custodyNote, updatedAt: nowIso() })
    .where(eq(matters.id, matterId))
    .run();
  addAudit(matterId, actor, "custody_update", before, { physicalCustody, custodyNote });
}

export function updateMatterFields(
  matterId: string,
  fields: Partial<{
    googleDocUrl: string;
    latestArtifactUrl: string;
    latestArtifactLabel: string;
    systemOfRecord: string;
    effectivityStart: string;
    effectivityEnd: string;
  }>,
  actor: { id: string; name: string }
) {
  const db = getDb();
  const matter = getMatterById(matterId);
  if (!matter) throw new Error("Matter not found");
  const expiryBucket = fields.effectivityEnd !== undefined
    ? computeExpiryBucket(fields.effectivityEnd)
    : matter.expiryBucket;
  db.update(matters)
    .set({ ...fields, expiryBucket, updatedAt: nowIso() })
    .where(eq(matters.id, matterId))
    .run();
  addAudit(matterId, actor, "metadata_update", null, fields);
}

export function recordPrintedCopy(matterId: string, actor: { id: string; name: string }, date?: string) {
  const db = getDb();
  const at = date ? new Date(date).toISOString() : nowIso();
  db.update(matters)
    .set({ printedCopyIssuedAt: at, updatedAt: nowIso() })
    .where(eq(matters.id, matterId))
    .run();
  addAudit(matterId, actor, "routing_print", null, { printedCopyIssuedAt: at });
}

export function searchMatters(filters: {
  status?: string;
  entityId?: string;
  departmentId?: string;
  contractType?: string;
  expiryBucket?: string;
  assigneeId?: string;
  q?: string;
  statuses?: string[];
}) {
  const db = getDb();
  const conditions = [];
  if (filters.status) conditions.push(eq(matters.status, filters.status));
  if (filters.statuses?.length) conditions.push(inArray(matters.status, filters.statuses));
  if (filters.entityId) conditions.push(eq(matters.entityId, filters.entityId));
  if (filters.departmentId) conditions.push(eq(matters.departmentId, filters.departmentId));
  if (filters.contractType) conditions.push(eq(matters.contractType, filters.contractType));
  if (filters.expiryBucket) conditions.push(eq(matters.expiryBucket, filters.expiryBucket));
  if (filters.assigneeId) conditions.push(eq(matters.assigneeUserId, filters.assigneeId));
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        like(matters.title, pattern),
        like(matters.counterparty, pattern),
        like(matters.matterNumber, pattern)
      )!
    );
  }
  const query = db.select().from(matters).orderBy(desc(matters.updatedAt)).limit(100);
  if (conditions.length) {
    return query.where(and(...conditions)).all();
  }
  return query.all();
}

export function getPoolMatters() {
  return getDb()
    .select()
    .from(matters)
    .where(eq(matters.status, "In Pool"))
    .orderBy(desc(matters.createdAt))
    .all();
}

export function getAllEntities() {
  return getDb().select().from(entities).all();
}

export function getAllDepartments() {
  return getDb().select().from(departments).all();
}

export function getLegalUsers() {
  return getDb()
    .select()
    .from(users)
    .where(or(eq(users.role, "legal"), eq(users.role, "assigner")))
    .all();
}