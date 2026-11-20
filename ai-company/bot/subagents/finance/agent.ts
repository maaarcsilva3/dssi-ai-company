import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Finance for budget framing, pricing assumptions, unit economics, scenarios, and go/no-go money calls. Delegate for spend, pricing, or financial readiness.",
  model: { id: "auto" },
});
