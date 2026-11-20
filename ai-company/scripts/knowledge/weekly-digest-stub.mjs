#!/usr/bin/env node
/**
 * ASSUMPTION: run weekly (Friday UTC) via host cron or CI.
 * Example cron: 0 9 * * 5 cd /path/to/dssi-ai-company && node ai-company/scripts/knowledge/weekly-digest-stub.mjs
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const tools = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../company-workspace/knowledge/_tools/digest.mjs",
);

const { generateDigest } = await import(pathToFileURL(tools).href);

const result = generateDigest({
  title: "Weekly intelligence digest (stub job)",
});

console.log(`Weekly digest stub wrote: ${result.path}`);