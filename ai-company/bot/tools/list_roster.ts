import { defineTool } from "@grok/agent-sdk/tools";
import { loadRoster } from "../lib/store.js";

export default defineTool({
  description:
    "List current AI employees and their function briefs. Call before planning work or when the CEO asks who is on the team. Data is shared via company-data/ across machines.",
  effect: "read",
  async execute() {
    return { employees: loadRoster() };
  },
});
