import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // requester | legal | assigner | manager | admin
  departmentId: text("department_id"),
  createdAt: text("created_at").notNull(),
});

export const entities = sqliteTable("entities", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  entityId: text("entity_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
});

export const matters = sqliteTable("matters", {
  id: text("id").primaryKey(),
  matterNumber: text("matter_number").notNull().unique(),
  entityId: text("entity_id").notNull(),
  departmentId: text("department_id").notNull(),
  title: text("title").notNull(),
  contractType: text("contract_type").notNull(),
  counterparty: text("counterparty").notNull(),
  proponentName: text("proponent_name").notNull(),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("Submitted"),
  assigneeUserId: text("assignee_user_id"),
  googleDocUrl: text("google_doc_url"),
  systemOfRecord: text("system_of_record").default("gdocs"),
  effectivityStart: text("effectivity_start"),
  effectivityEnd: text("effectivity_end"),
  expiryBucket: text("expiry_bucket").default("Unknown"),
  physicalCustody: text("physical_custody"),
  custodyNote: text("custody_note"),
  printedCopyIssuedAt: text("printed_copy_issued_at"),
  latestArtifactUrl: text("latest_artifact_url"),
  latestArtifactLabel: text("latest_artifact_label"),
  onHoldReason: text("on_hold_reason"),
  submittedByUserId: text("submitted_by_user_id"),
  internalNotes: text("internal_notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  matterId: text("matter_id").notNull(),
  actorUserId: text("actor_user_id"),
  actorName: text("actor_name"),
  eventType: text("event_type").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  note: text("note"),
  occurredAt: text("occurred_at").notNull(),
});

export const matterSequence = sqliteTable("matter_sequence", {
  entityCode: text("entity_code").primaryKey(),
  year: integer("year").notNull(),
  lastNumber: integer("last_number").notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type Matter = typeof matters.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;