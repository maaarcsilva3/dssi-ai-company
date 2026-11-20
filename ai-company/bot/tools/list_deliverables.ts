import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { loadDeliverables } from "../lib/store.js";

export default defineTool({
  description:
    "List logged company deliverables from shared company-data/ (includes work from other machines after sync). Optionally filter to the current session only.",
  effect: "read",
  inputSchema: z.object({
    currentSessionOnly: z
      .boolean()
      .optional()
      .describe("When true, only return deliverables from this session"),
  }),
  async execute({ currentSessionOnly }, ctx) {
    let items = loadDeliverables();
    if (currentSessionOnly) {
      items = items.filter((d) => d.sessionId === ctx.session.id);
    }
    return {
      count: items.length,
      deliverables: items.map((d) => ({
        id: d.id,
        role: d.role,
        title: d.title,
        kind: d.kind,
        body: d.body,
        createdAt: d.createdAt,
        sessionId: d.sessionId,
        machine: d.machine,
      })),
    };
  },
});
