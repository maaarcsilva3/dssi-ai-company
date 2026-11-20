import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_VERSION, DECISIONS_CATEGORY } from "./constants.mjs";
import { PATHS, ensureDir, ensureKbLayout, resolveKbRelative } from "./paths.mjs";
import { assertCurated, assertCategory, rawRefsExist } from "./validate.mjs";
import { refreshVerificationQueue } from "./queue.mjs";

function curatedPath(id) {
  return path.join(PATHS.curated, `${id}.json`);
}

function slugId(prefix, title) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${prefix}_${base || "item"}_${suffix}`;
}

function existsRawRef(rel) {
  try {
    return fs.existsSync(resolveKbRelative(rel));
  } catch {
    return false;
  }
}

function readCurated(id) {
  const file = curatedPath(id);
  if (!fs.existsSync(file)) throw new Error(`Curated record not found: ${id}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeCurated(record) {
  assertCurated(record);
  ensureDir(PATHS.curated);
  fs.writeFileSync(curatedPath(record.id), `${JSON.stringify(record, null, 2)}\n`);
  refreshVerificationQueue();
}

/**
 * Create curated record; Decisions stay unverified and lifecycle forced to outdated until CEO verifies.
 */
export function createCurated({
  title,
  body,
  source_ref,
  recorded_at,
  project = null,
  category,
  id,
}) {
  ensureKbLayout();
  assertCategory(category);
  rawRefsExist(source_ref, existsRawRef);

  const now = new Date().toISOString();
  const recordId =
    id ??
    slugId(
      category === DECISIONS_CATEGORY ? "curated_decision" : "curated",
      title,
    );

  let lifecycle_status = "current";
  let verification_status = "unverified";
  if (category === DECISIONS_CATEGORY) {
    lifecycle_status = "outdated";
    verification_status = "unverified";
  }

  const record = {
    schema_version: SCHEMA_VERSION,
    id: recordId,
    title,
    body,
    source_ref: [...source_ref],
    recorded_at: recorded_at ?? now,
    project,
    category,
    verification_status,
    lifecycle_status,
    superseded_by: null,
    supersedes: null,
    audit: [
      {
        at: now,
        actor: "chief-of-staff",
        action: "created",
        note: "Created via knowledge curated CRUD",
      },
    ],
    created_at: now,
    updated_at: now,
  };

  assertCurated(record);
  writeCurated(record);
  return record;
}

export function updateCurated(id, patch, actor = "chief-of-staff") {
  const record = readCurated(id);
  const now = new Date().toISOString();

  if (patch.source_ref) {
    rawRefsExist(patch.source_ref, existsRawRef);
    record.source_ref = [...patch.source_ref];
  }
  if (patch.title != null) record.title = patch.title;
  if (patch.body != null) record.body = patch.body;
  if (patch.project !== undefined) record.project = patch.project;
  if (patch.category != null) {
    assertCategory(patch.category);
    record.category = patch.category;
  }
  if (patch.recorded_at != null) record.recorded_at = patch.recorded_at;

  record.updated_at = now;
  record.audit.push({
    at: now,
    actor,
    action: "updated",
    note: `Fields: ${Object.keys(patch).join(", ")}`,
  });

  assertCurated(record);
  writeCurated(record);
  return record;
}

export function supersedeCurated(oldId, newRecordInput, actor = "chief-of-staff") {
  const oldRecord = readCurated(oldId);
  const newRecord = createCurated(newRecordInput);
  const now = new Date().toISOString();

  oldRecord.lifecycle_status = "superseded";
  oldRecord.superseded_by = newRecord.id;
  oldRecord.updated_at = now;
  oldRecord.audit.push({
    at: now,
    actor,
    action: "superseded",
    note: `Superseded by ${newRecord.id}`,
  });

  newRecord.supersedes = oldId;
  newRecord.audit.push({
    at: now,
    actor,
    action: "supersedes",
    note: `Replaces ${oldId}`,
  });

  writeCurated(oldRecord);
  writeCurated(newRecord);
  return { old: oldRecord, new: newRecord };
}

export function listCurated() {
  ensureKbLayout();
  if (!fs.existsSync(PATHS.curated)) return [];
  return fs
    .readdirSync(PATHS.curated)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PATHS.curated, f), "utf8")));
}

export { readCurated };