import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { defineAgent } from "@grok/agent-sdk";

/** Durable shared workspace so every playground chat sees the same company files. */
const workspaceDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../company-workspace",
);
mkdirSync(workspaceDir, { recursive: true });

export default defineAgent({
  name: "AI Company HQ",
  model: { id: "auto" },
  local: {
    workspaceDir,
  },
});
