import fs from "node:fs";
import path from "node:path";
import { listCurated, readCurated } from "./curated.mjs";
import { KB_ROOT, resolveKbRelative } from "./paths.mjs";

function loadRawPointer(sourceRef) {
  const abs = resolveKbRelative(sourceRef);
  if (!fs.existsSync(abs)) {
    return { ref: sourceRef, exists: false, summary: null };
  }

  const raw = fs.readFileSync(abs, "utf8");
  let summary = raw.slice(0, 280);
  if (raw.length > 280) summary += "…";

  let meta = null;
  const metaGuess =
    sourceRef.endsWith(".meta.json")
      ? sourceRef
      : sourceRef.replace(/\.json$/, ".meta.json");
  try {
    const metaAbs = resolveKbRelative(metaGuess);
    if (fs.existsSync(metaAbs)) {
      meta = JSON.parse(fs.readFileSync(metaAbs, "utf8"));
    }
  } catch {
    /* optional */
  }

  return {
    ref: sourceRef,
    exists: true,
    meta,
    summary,
  };
}

/**
 * Filter curated records by optional project, category, verification, lifecycle.
 */
export function retrieve({ project, category, verification_status, lifecycle_status } = {}) {
  let rows = listCurated();

  if (project != null) rows = rows.filter((r) => r.project === project);
  if (category) rows = rows.filter((r) => r.category === category);
  if (verification_status) {
    rows = rows.filter((r) => r.verification_status === verification_status);
  }
  if (lifecycle_status) {
    rows = rows.filter((r) => r.lifecycle_status === lifecycle_status);
  }

  return rows.map((record) => ({
    ...record,
    raw_pointers: record.source_ref.map((ref) => loadRawPointer(ref)),
  }));
}

/**
 * Build a context pack for COO task prompts (markdown + JSON).
 */
export function contextPack({
  audience_role = "coo",
  project = null,
  category = null,
  prefer_verified = true,
  limit = 20,
} = {}) {
  const verified = retrieve({
    project,
    category,
    verification_status: prefer_verified ? "verified_ceo" : undefined,
    lifecycle_status: "current",
  });

  const verifiedPm = retrieve({
    project,
    category,
    verification_status: "verified_pm",
    lifecycle_status: "current",
  });

  const unverified = retrieve({
    project,
    category,
    verification_status: "unverified",
  });

  const merged = [];
  const seen = new Set();
  for (const batch of [verified, verifiedPm, unverified]) {
    for (const row of batch) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
      if (merged.length >= limit) break;
    }
    if (merged.length >= limit) break;
  }

  const verifiedFacts = merged.filter((r) =>
    ["verified_ceo", "verified_pm"].includes(r.verification_status),
  );
  const drafts = merged.filter((r) => r.verification_status === "unverified");
  const rawPointers = [];
  for (const row of merged) {
    for (const p of row.raw_pointers) {
      if (!rawPointers.some((x) => x.ref === p.ref)) rawPointers.push(p);
    }
  }

  const generated_at = new Date().toISOString();

  const json = {
    schema_version: 1,
    kind: "context_pack",
    generated_at,
    audience_role,
    project,
    category,
    verified: verifiedFacts.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      verification_status: r.verification_status,
      lifecycle_status: r.lifecycle_status,
      body: r.body,
      source_ref: r.source_ref,
    })),
    unverified_drafts: drafts.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      body: r.body,
      source_ref: r.source_ref,
    })),
    raw_pointers: rawPointers.map((p) => ({
      ref: p.ref,
      exists: p.exists,
      recorded_at: p.meta?.recorded_at ?? null,
      kind: p.meta?.kind ?? null,
    })),
  };

  const mdLines = [
    `# Context pack`,
    ``,
    `- **Audience:** ${audience_role}`,
    `- **Project:** ${project ?? "(any)"}`,
    `- **Category:** ${category ?? "(any)"}`,
    `- **Generated:** ${generated_at}`,
    `- **KB root:** \`company-workspace/knowledge/\``,
    ``,
    `## Verified context`,
    ``,
  ];

  if (verifiedFacts.length === 0) {
    mdLines.push(`_None matched filters._`, ``);
  } else {
    for (const r of verifiedFacts) {
      mdLines.push(
        `### ${r.title} (\`${r.id}\`)`,
        `- Category: ${r.category}`,
        `- Verification: ${r.verification_status}`,
        `- Lifecycle: ${r.lifecycle_status}`,
        `- source_ref: ${r.source_ref.join(", ")}`,
        ``,
        r.body,
        ``,
      );
    }
  }

  mdLines.push(`## Unverified / draft`, ``);
  if (drafts.length === 0) {
    mdLines.push(`_None._`, ``);
  } else {
    for (const r of drafts) {
      mdLines.push(
        `- **${r.title}** (\`${r.id}\`) — ${r.category}; source_ref: ${r.source_ref.join(", ")}`,
      );
    }
    mdLines.push(``);
  }

  mdLines.push(`## Raw pointers`, ``);
  for (const p of rawPointers) {
    mdLines.push(
      `- \`${p.ref}\`${p.exists ? "" : " _(missing)_"}${p.meta?.recorded_at ? ` — ${p.meta.recorded_at}` : ""}`,
    );
  }

  const markdown = mdLines.join("\n");

  return { markdown, json, path: path.join(KB_ROOT, "index", "context-pack-latest.json") };
}

export function writeContextPack(options) {
  const pack = contextPack(options);
  fs.writeFileSync(pack.path, `${JSON.stringify(pack.json, null, 2)}\n`);
  return pack;
}