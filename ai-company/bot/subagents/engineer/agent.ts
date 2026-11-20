import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Engineer: implementation plans, architecture, interfaces, technical risks, and delivery steps.",
  model: { id: "auto" },
});
