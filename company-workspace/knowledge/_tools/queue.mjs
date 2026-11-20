import fs from "node:fs";
import path from "node:path";
import { DECISIONS_CATEGORY, SCHEMA_VERSION } from "./constants.mjs";
import { PATHS, ensureDir, ensureKbLayout } from "./paths.mjs";

const QUEUE_FILE = path.join(PATHS.queue, "verification.json");

function readAllCuratedFiles() {
  if (!fs.existsSync(PATHS.curated)) return [];
  return fs
    .readdirSync(PATHS.curated)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PATHS.curated, f), "utf8")));
}

export function refreshVerificationQueue() {
  ensureKbLayout();
  ensureDir(PATHS.queue);

  const items = readAllCuratedFiles()
    .filter((r) => r.verification_status === "unverified")
    .map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      project: r.project,
      lifecycle_status: r.lifecycle_status,
      recorded_at: r.recorded_at,
      suggested_verifier:
        r.category === DECISIONS_CATEGORY ? "CEO" : "CEO or PM",
      source_ref: r.source_ref,
    }));

  const queue = {
    schema_version: SCHEMA_VERSION,
    updated_at: new Date().toISOString(),
    policy: {
      decisions_current_requires: "verified_ceo",
      note: "Decisions category must reach verified_ceo before lifecycle may be current (CEO locked 2026-11-20).",
    },
    items,
  };

  fs.writeFileSync(QUEUE_FILE, `${JSON.stringify(queue, null, 2)}\n`);
  return queue;
}

export function listVerificationQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return refreshVerificationQueue();
  return JSON.parse(fs.readFileSync(QUEUE_FILE, "utf8"));
}