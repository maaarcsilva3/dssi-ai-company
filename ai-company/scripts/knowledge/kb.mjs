#!/usr/bin/env node
/**
 * Knowledge base CLI (S2–S6). No extra npm deps — uses company-workspace/knowledge/_tools/.
 *
 * Usage:
 *   node ai-company/scripts/knowledge/kb.mjs ingest-journal
 *   node ai-company/scripts/knowledge/kb.mjs curated create --title "..." --body "..." --category Decisions --source-ref raw/chats/foo.meta.json
 *   node ai-company/scripts/knowledge/kb.mjs queue list
 *   node ai-company/scripts/knowledge/kb.mjs verify --id curated_decision_... --as ceo --actor CEO
 *   node ai-company/scripts/knowledge/kb.mjs context-pack --project chief-of-staff
 *   node ai-company/scripts/knowledge/kb.mjs smoke
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TOOLS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../company-workspace/knowledge/_tools",
);

async function load(moduleName) {
  return import(pathToFileURL(path.join(TOOLS, moduleName)).href);
}

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out.flags[key] = next;
        i++;
      } else {
        out.flags[key] = true;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function usage() {
  console.log(`Knowledge CLI

Commands:
  ingest-journal [--dry-run]
  curated create --title T --body B --category C --source-ref R [--source-ref R2] [--project P] [--recorded-at ISO] [--id ID]
  curated update --id ID [--title] [--body] [--source-ref R] ...
  queue list | queue refresh
  verify --id ID --as ceo|pm --actor NAME
  reject --id ID --actor NAME [--note TEXT]
  retrieve [--project P] [--category C] [--verification STATUS] [--lifecycle STATUS]
  context-pack [--project P] [--category C] [--role ROLE]
  digest [--project P] [--title T]
  smoke
`);
}

async function main() {
  const { _: cmd, flags } = parseArgs(process.argv.slice(2));
  const command = cmd[0];

  if (!command || command === "help" || flags.help) {
    usage();
    process.exit(command ? 0 : 1);
  }

  if (command === "ingest-journal") {
    const { ingestJournal } = await load("ingest-journal.mjs");
    const result = ingestJournal({ dryRun: Boolean(flags["dry-run"]) });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "curated") {
    const sub = cmd[1];
    const { createCurated, updateCurated } = await load("curated.mjs");
    if (sub === "create") {
      const sourceRefs = [];
      for (let i = 0; i < cmd.length; i++) {
        /* noop */
      }
      const rawArgv = process.argv.slice(2);
      for (let i = 0; i < rawArgv.length; i++) {
        if (rawArgv[i] === "--source-ref" && rawArgv[i + 1]) {
          sourceRefs.push(rawArgv[++i]);
        }
      }
      if (!flags.title || !flags.body || !flags.category || sourceRefs.length === 0) {
        throw new Error("curated create requires --title --body --category and at least one --source-ref");
      }
      const record = createCurated({
        title: flags.title,
        body: flags.body,
        category: flags.category,
        source_ref: sourceRefs,
        project: flags.project ?? null,
        recorded_at: flags["recorded-at"],
        id: flags.id,
      });
      console.log(JSON.stringify(record, null, 2));
      return;
    }
    if (sub === "update") {
      if (!flags.id) throw new Error("curated update requires --id");
      const patch = {};
      if (flags.title) patch.title = flags.title;
      if (flags.body) patch.body = flags.body;
      if (flags.category) patch.category = flags.category;
      if (flags.project !== undefined) patch.project = flags.project;
      const record = updateCurated(flags.id, patch, flags.actor ?? "cli");
      console.log(JSON.stringify(record, null, 2));
      return;
    }
    throw new Error(`Unknown curated subcommand: ${sub}`);
  }

  if (command === "queue") {
    const { listVerificationQueue, refreshVerificationQueue } = await load("queue.mjs");
    const sub = cmd[1] ?? "list";
    if (sub === "list") {
      console.log(JSON.stringify(listVerificationQueue(), null, 2));
      return;
    }
    if (sub === "refresh") {
      console.log(JSON.stringify(refreshVerificationQueue(), null, 2));
      return;
    }
    throw new Error(`Unknown queue subcommand: ${sub}`);
  }

  if (command === "verify") {
    const { verifyCurated } = await load("verification.mjs");
    if (!flags.id || !flags.as || !flags.actor) {
      throw new Error("verify requires --id --as ceo|pm --actor NAME");
    }
    console.log(JSON.stringify(verifyCurated(flags.id, { actor: flags.actor, as: flags.as }), null, 2));
    return;
  }

  if (command === "reject") {
    const { rejectCurated } = await load("verification.mjs");
    if (!flags.id || !flags.actor) throw new Error("reject requires --id --actor NAME");
    console.log(JSON.stringify(rejectCurated(flags.id, { actor: flags.actor, note: flags.note }), null, 2));
    return;
  }

  if (command === "retrieve") {
    const { retrieve } = await load("retrieve.mjs");
    console.log(
      JSON.stringify(
        retrieve({
          project: flags.project,
          category: flags.category,
          verification_status: flags.verification,
          lifecycle_status: flags.lifecycle,
        }),
        null,
        2,
      ),
    );
    return;
  }

  if (command === "context-pack") {
    const { writeContextPack } = await load("retrieve.mjs");
    const pack = writeContextPack({
      audience_role: flags.role ?? "coo",
      project: flags.project ?? null,
      category: flags.category ?? null,
    });
    console.log(pack.markdown);
    console.error(`\n(wrote ${pack.path})`);
    return;
  }

  if (command === "digest") {
    const { generateDigest } = await load("digest.mjs");
    const result = generateDigest({ project: flags.project ?? null, title: flags.title });
    console.log(result.markdown);
    console.error(`\n(wrote ${result.path})`);
    return;
  }

  if (command === "smoke") {
    const { ingestJournal } = await load("ingest-journal.mjs");
    const { createCurated } = await load("curated.mjs");
    const { listVerificationQueue } = await load("queue.mjs");
    const { writeContextPack } = await load("retrieve.mjs");
    const fs = await import("node:fs");
    const { PATHS } = await load("paths.mjs");

    const ingest = ingestJournal();
    let metaRef = null;
    if (fs.existsSync(PATHS.rawChats)) {
      const first = fs
        .readdirSync(PATHS.rawChats)
        .find((f) => f.endsWith(".meta.json"));
      if (first) metaRef = `raw/chats/${first}`;
    }

    if (!metaRef) {
      throw new Error("smoke: no raw chat meta after ingest");
    }

    const decision = createCurated({
      title: "Chief of Staff as 7th platform role",
      body: "CEO chose option (d): add Chief of Staff as a real seventh AI employee with six v1 responsibilities (journal 2026-11-20).",
      category: "Decisions",
      project: "chief-of-staff",
      source_ref: [metaRef],
      recorded_at: "2026-11-20T14:08:48.262Z",
      id: "curated_decision_cos_seventh_role_smoke",
    });

    const queue = listVerificationQueue();

    const pack = writeContextPack({ project: "chief-of-staff", audience_role: "engineer" });

    console.log(
      JSON.stringify(
        {
          smoke: "ok",
          ingest,
          sample_curated_id: decision.id,
          queue_items: queue.items.length,
          context_pack: pack.path,
        },
        null,
        2,
      ),
    );
    return;
  }

  usage();
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});