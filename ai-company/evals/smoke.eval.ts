import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  description:
    "CEO objective spanning software, marketing, and finance triggers tools and a successful turn.",
  async test(t) {
    await t.send(
      [
        "Objective: Ship a landing page for our B2B analytics SaaS.",
        "Budget $5k. Engage engineer, marketer, and finance.",
        "Log deliverables from each, then return a 1-page CEO brief.",
      ].join(" "),
    );
    t.succeeded();
    t.calledTool("list_roster");
    t.calledTool("log_deliverable");
  },
});
