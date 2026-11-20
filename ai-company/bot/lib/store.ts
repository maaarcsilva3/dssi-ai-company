/**
 * Shared company-data on disk so every machine with this project folder
 * (git clone / cloud sync) sees the same roster and deliverables.
 */
import { hostname } from "node:os";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_ROSTER,
  normalizeDeliverables,
  normalizeRoster,
  type Deliverable,
  type RoleBrief,
} from "./company.js";

const companyDataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../company-data",
);

const rosterPath = path.join(companyDataDir, "roster.json");
const deliverablesPath = path.join(companyDataDir, "deliverables.json");

function ensureDir() {
  mkdirSync(companyDataDir, { recursive: true });
}

function readJsonFile(filePath: string): unknown {
  if (!existsSync(filePath)) return undefined;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

function writeJsonAtomic(filePath: string, value: unknown) {
  ensureDir();
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tmp, filePath);
}

export function loadRoster(): RoleBrief[] {
  const raw = readJsonFile(rosterPath);
  if (raw === undefined) {
    const seed = DEFAULT_ROSTER.map((r) => ({ ...r }));
    writeJsonAtomic(rosterPath, seed);
    return seed;
  }
  return normalizeRoster(raw);
}

export function saveRoster(roster: RoleBrief[]): void {
  writeJsonAtomic(rosterPath, normalizeRoster(roster));
}

export function loadDeliverables(): Deliverable[] {
  return normalizeDeliverables(readJsonFile(deliverablesPath));
}

export function saveDeliverables(items: Deliverable[]): void {
  writeJsonAtomic(deliverablesPath, items);
}

export function appendDeliverable(
  item: Omit<Deliverable, "machine"> & { machine?: string },
): Deliverable {
  const full: Deliverable = {
    ...item,
    machine: item.machine ?? hostname(),
  };
  const next = [...loadDeliverables(), full];
  saveDeliverables(next);
  return full;
}

export function companyDataRoot(): string {
  ensureDir();
  return companyDataDir;
}
