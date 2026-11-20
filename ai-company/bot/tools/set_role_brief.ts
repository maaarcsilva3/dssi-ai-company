import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { ROLE_IDS } from "../lib/company.js";
import { loadRoster, saveRoster } from "../lib/store.js";

export default defineTool({
  description:
    "Update one employee's function brief. Use when the CEO assigns or changes what a role does. Persists to shared company-data/.",
  effect: "idempotent",
  inputSchema: z.object({
    role: z.enum(ROLE_IDS),
    function: z
      .string()
      .min(1)
      .describe("What this role owns and how they should work"),
    title: z.string().min(1).optional().describe("Optional display title"),
  }),
  async execute({ role, function: fn, title }) {
    const roster = loadRoster();
    const next = roster.map((item) =>
      item.role === role
        ? {
            ...item,
            function: fn,
            title: title ?? item.title,
          }
        : item,
    );
    saveRoster(next);
    const updated = next.find((item) => item.role === role)!;
    return { ok: true as const, employee: updated };
  },
});
