import fs from "node:fs";
import path from "node:path";
import { DECISIONS_CATEGORY } from "./constants.mjs";
import { PATHS } from "./paths.mjs";
import { assertCurated } from "./validate.mjs";
import { readCurated } from "./curated.mjs";
import { refreshVerificationQueue, listVerificationQueue } from "./queue.mjs";

export { listVerificationQueue };

function writeCuratedFile(record) {
  fs.writeFileSync(
    path.join(PATHS.curated, `${record.id}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

export function verifyCurated(id, { actor, as }) {
  if (!["ceo", "pm"].includes(as)) {
    throw new Error('as must be "ceo" or "pm"');
  }

  const record = readCurated(id);
  const now = new Date().toISOString();
  const status = as === "ceo" ? "verified_ceo" : "verified_pm";

  if (record.category === DECISIONS_CATEGORY && as !== "ceo") {
    throw new Error("Decisions category requires CEO verification");
  }

  record.verification_status = status;
  record.updated_at = now;

  if (
    record.category === DECISIONS_CATEGORY &&
    status === "verified_ceo" &&
    record.lifecycle_status !== "superseded"
  ) {
    record.lifecycle_status = "current";
  } else if (
    record.category !== DECISIONS_CATEGORY &&
    status.startsWith("verified_") &&
    record.lifecycle_status === "outdated"
  ) {
    record.lifecycle_status = "current";
  }

  record.audit.push({
    at: now,
    actor,
    action: status,
    note: `Verification by ${as}`,
  });

  assertCurated(record);
  writeCuratedFile(record);
  refreshVerificationQueue();
  return record;
}

export function rejectCurated(id, { actor, note }) {
  const record = readCurated(id);
  const now = new Date().toISOString();

  record.verification_status = "rejected";
  record.lifecycle_status = "outdated";
  record.updated_at = now;
  record.audit.push({
    at: now,
    actor,
    action: "rejected",
    note: note ?? "Rejected by verifier",
  });

  assertCurated(record);
  writeCuratedFile(record);
  refreshVerificationQueue();
  return record;
}