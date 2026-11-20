import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "QA for test plans, quality gates, edge cases, and release go/no-go. Delegate when shipping risk or verification needs a hard look.",
  model: { id: "auto" },
});
