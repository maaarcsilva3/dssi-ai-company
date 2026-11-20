import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "QA: test plans, quality gates, edge cases, and release risk for product and engineering work.",
  model: { id: "auto" },
});
