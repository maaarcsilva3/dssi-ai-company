import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** `company-workspace/knowledge/` */
export const KB_ROOT = path.resolve(__dirname, "..");

/** Monorepo root (`dssi-ai-company/`) */
export const REPO_ROOT = path.resolve(KB_ROOT, "../..");

export const MEMORY_DIR = path.join(REPO_ROOT, "company-workspace/memory");

export const PATHS = {
  rawChats: path.join(KB_ROOT, "raw/chats"),
  rawMeetings: path.join(KB_ROOT, "raw/meetings"),
  rawDocs: path.join(KB_ROOT, "raw/docs"),
  rawEmail: path.join(KB_ROOT, "raw/email"),
  curated: path.join(KB_ROOT, "curated"),
  index: path.join(KB_ROOT, "index"),
  queue: path.join(KB_ROOT, "queue"),
  templates: path.join(KB_ROOT, "templates"),
};

export function kbRelative(absPath) {
  return path.relative(KB_ROOT, absPath).split(path.sep).join("/");
}

export function resolveKbRelative(rel) {
  const normalized = rel.replace(/^\//, "");
  const abs = path.resolve(KB_ROOT, normalized);
  if (!abs.startsWith(KB_ROOT)) {
    throw new Error(`Path escapes KB root: ${rel}`);
  }
  return abs;
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function ensureKbLayout() {
  for (const dir of Object.values(PATHS)) {
    ensureDir(dir);
  }
}