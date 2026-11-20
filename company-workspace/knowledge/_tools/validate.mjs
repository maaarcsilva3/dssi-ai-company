import { CATEGORIES, DECISIONS_CATEGORY, RAW_KINDS } from "./constants.mjs";

export function assertCategory(category) {
  if (!CATEGORIES.includes(category)) {
    throw new Error(`Invalid category: ${category}`);
  }
}

export function assertRawMeta(meta) {
  if (meta.schema_version !== 1) throw new Error("raw meta: unsupported schema_version");
  if (!meta.id) throw new Error("raw meta: missing id");
  if (!RAW_KINDS.includes(meta.kind)) throw new Error(`raw meta: invalid kind ${meta.kind}`);
  if (!meta.recorded_at) throw new Error("raw meta: missing recorded_at");
  if (meta.source_ref == null) throw new Error("raw meta: missing source_ref");
  if (!meta.content_path) throw new Error("raw meta: missing content_path");
}

export function assertCurated(record) {
  if (record.schema_version !== 1) throw new Error("curated: unsupported schema_version");
  if (!record.id) throw new Error("curated: missing id");
  if (!record.title) throw new Error("curated: missing title");
  if (!Array.isArray(record.source_ref) || record.source_ref.length < 1) {
    throw new Error("curated: source_ref must have at least one entry");
  }
  assertCategory(record.category);
  if (!record.verification_status) throw new Error("curated: missing verification_status");
  if (!record.lifecycle_status) throw new Error("curated: missing lifecycle_status");

  if (record.category === DECISIONS_CATEGORY && record.lifecycle_status === "current") {
    if (record.verification_status !== "verified_ceo") {
      throw new Error(
        "Decisions with lifecycle current require verification_status verified_ceo (CEO locked 2026-11-20)",
      );
    }
  }
}

export function rawRefsExist(sourceRefs, existsFn) {
  for (const ref of sourceRefs) {
    if (!existsFn(ref)) {
      throw new Error(`source_ref not found: ${ref}`);
    }
  }
}