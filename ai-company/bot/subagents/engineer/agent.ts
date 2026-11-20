import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Engineer for architecture, implementation plans, interfaces, technical risks, and delivery slices. Delegate for build/tech execution plans or code.",
  model: { id: "auto" },
});
