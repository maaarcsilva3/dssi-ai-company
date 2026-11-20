import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Finance: budget, pricing assumptions, unit economics, spend risk, and financial readiness notes.",
  model: { id: "auto" },
});
