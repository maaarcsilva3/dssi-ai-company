import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Product manager: specs, priorities, scope, acceptance criteria, and success metrics for a CEO objective.",
  model: { id: "auto" },
});
