import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { ROLE_IDS } from "../lib/company.js";
import { appendDeliverable } from "../lib/store.js";

export default defineTool({
  description:
    "Store a named company deliverable (brief, plan, report, copy). Call after a specialist finishes useful work. Persists to shared company-data/ so other machines can see it after sync.",
  effect: "write",
  inputSchema: z.object({
    role: z.enum([...ROLE_IDS, "coo"]),
    title: z.string().min(1),
    kind: z
      .string()
      .min(1)
      .describe("Artifact kind, e.g. product-brief, tech-plan, gtm, finance"),
    body: z.string().min(1).describe("Full deliverable text"),
  }),
  async execute({ role, title, kind, body }, ctx) {
    const item = appendDeliverable({
      id: `del_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      role,
      title,
      kind,
      body,
      createdAt: new Date().toISOString(),
      sessionId: ctx.session.id,
    });
    return {
      ok: true as const,
      deliverable: {
        id: item.id,
        role: item.role,
        title: item.title,
        kind: item.kind,
        createdAt: item.createdAt,
        sessionId: item.sessionId,
        machine: item.machine,
      },
    };
  },
});
