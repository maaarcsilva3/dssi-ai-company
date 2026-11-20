import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_VERSION } from "./constants.mjs";
import {
  KB_ROOT,
  MEMORY_DIR,
  PATHS,
  ensureDir,
  ensureKbLayout,
  kbRelative,
} from "./paths.mjs";

const INDEX_FILE = path.join(PATHS.index, "journal-ingest.json");

function loadIngestIndex() {
  if (!fs.existsSync(INDEX_FILE)) {
    return { schema_version: 1, ingested: {} };
  }
  return JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
}

function saveIngestIndex(index) {
  ensureDir(PATHS.index);
  fs.writeFileSync(INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`);
}

function stableChatId(sessionId, at) {
  const digest = crypto
    .createHash("sha256")
    .update(`${sessionId}\0${at}`, "utf8")
    .digest("hex")
    .slice(0, 16);
  return `raw_chat_${digest}`;
}

function listJournalFiles() {
  if (!fs.existsSync(MEMORY_DIR)) return [];
  const names = fs.readdirSync(MEMORY_DIR);
  const files = [];
  for (const name of names) {
    if (name === "journal.jsonl" || /^journal-.*\.jsonl$/.test(name)) {
      files.push(path.join(MEMORY_DIR, name));
    }
  }
  return files.sort();
}

/**
 * @returns {{ created: number, skipped: number, ids: string[] }}
 */
export function ingestJournal({ dryRun = false } = {}) {
  ensureKbLayout();
  ensureDir(PATHS.rawChats);

  const index = loadIngestIndex();
  let created = 0;
  let skipped = 0;
  const ids = [];

  for (const journalPath of listJournalFiles()) {
    const journalRel = path
      .relative(path.join(KB_ROOT, ".."), journalPath)
      .split(path.sep)
      .join("/");
    const lines = fs.readFileSync(journalPath, "utf8").split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }

      const { sessionId, at } = row;
      if (!sessionId || !at) continue;

      const id = stableChatId(sessionId, at);
      const indexKey = `${journalRel}#${sessionId}#${at}`;

      if (index.ingested[indexKey]) {
        skipped++;
        ids.push(id);
        continue;
      }

      const contentFile = path.join(PATHS.rawChats, `${id}.json`);
      const metaFile = path.join(PATHS.rawChats, `${id}.meta.json`);

      if (fs.existsSync(contentFile) || fs.existsSync(metaFile)) {
        skipped++;
        if (!dryRun) {
          index.ingested[indexKey] = { id, at: new Date().toISOString() };
        }
        ids.push(id);
        continue;
      }

      const contentPathRel = kbRelative(contentFile);
      const meta = {
        schema_version: SCHEMA_VERSION,
        id,
        kind: "chat",
        recorded_at: at,
        project: null,
        source_ref: `${journalRel}#line:${i + 1}`,
        content_path: contentPathRel,
        ingested_at: new Date().toISOString(),
        category: null,
        verification_status: "n/a",
        lifecycle_status: "current",
      };

      if (!dryRun) {
        fs.writeFileSync(contentFile, `${JSON.stringify(row, null, 2)}\n`);
        fs.writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
        index.ingested[indexKey] = { id, at: meta.ingested_at };
      }

      created++;
      ids.push(id);
    }
  }

  if (!dryRun) saveIngestIndex(index);

  return { created, skipped, ids };
}