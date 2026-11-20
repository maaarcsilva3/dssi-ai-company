import fs from "node:fs";
import path from "node:path";
import { listCurated } from "./curated.mjs";
import { listVerificationQueue } from "./queue.mjs";
import { PATHS, ensureDir, ensureKbLayout } from "./paths.mjs";

const DIGEST_SCHEDULE = {
  cadence: "weekly",
  default_day_utc: "Friday",
  also: "when Chief of Staff is engaged on an objective",
};

/**
 * Light intelligence digest stub (S9 preview) — cites source_ref on each theme.
 */
export function generateDigest({ project = null, title = "Intelligence digest (stub)" } = {}) {
  ensureKbLayout();
  ensureDir(PATHS.templates);

  const curated = listCurated().filter((r) =>
    project == null ? true : r.project === project,
  );
  const queue = listVerificationQueue();

  const themes = curated.slice(0, 8).map((r) => ({
    theme: r.title,
    category: r.category,
    verification: r.verification_status,
    lifecycle: r.lifecycle_status,
    source_ref: r.source_ref,
  }));

  const risks = queue.items.slice(0, 5).map((item) => ({
    risk: `Unverified: ${item.title}`,
    verifier: item.suggested_verifier,
    source_ref: item.source_ref,
  }));

  const generated_at = new Date().toISOString();
  const mdParts = [
    `# ${title}`,
    ``,
    `- **Generated:** ${generated_at}`,
    `- **Schedule (ASSUMPTION):** ${DIGEST_SCHEDULE.cadence} (${DIGEST_SCHEDULE.default_day_utc} UTC) + ${DIGEST_SCHEDULE.also}`,
    `- **Project filter:** ${project ?? "(all)"}`,
    ``,
    `## Patterns / themes`,
    ``,
  ];

  if (themes.length === 0) {
    mdParts.push(`_No curated items yet._`);
  } else {
    for (const t of themes) {
      mdParts.push(
        `- **${t.theme}** (${t.category}, ${t.verification}, ${t.lifecycle}) — source_ref: ${t.source_ref.join(", ")}`,
      );
    }
  }

  mdParts.push(``, `## Risks / open verification`, ``);
  if (risks.length === 0) {
    mdParts.push(`_Queue empty._`);
  } else {
    for (const r of risks) {
      mdParts.push(`- ${r.risk} → ${r.verifier}; source_ref: ${r.source_ref.join(", ")}`);
    }
  }

  mdParts.push(
    ``,
    `## Opportunities / unresolved`,
    ``,
    `- _Stub — expand in S9 with retrieval ranking and connector-fed raw volume._`,
    ``,
  );

  const md = mdParts.join("\n");

  const outDir = path.join(PATHS.index, "digests");
  ensureDir(outDir);
  const stamp = generated_at.replace(/[:.]/g, "-");
  const outFile = path.join(outDir, `digest-${stamp}.md`);
  fs.writeFileSync(outFile, md);

  return { path: outFile, markdown: md, schedule: DIGEST_SCHEDULE };
}