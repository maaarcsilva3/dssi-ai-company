import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Product manager for specs, prioritization, acceptance criteria, and success metrics. Delegate when the objective needs a problem/user/scope brief before build or GTM.",
  model: { id: "auto" },
});
