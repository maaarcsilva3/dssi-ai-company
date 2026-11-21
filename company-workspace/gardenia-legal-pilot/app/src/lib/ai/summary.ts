import { listAudit } from "../matters/service";
import type { Matter } from "../db/schema";
import { expiryFlags } from "../matters/expiry";

const DISCLAIMER =
  "Assistive only. Not legal advice. An attorney must review all decisions.";

export async function generateStatusSummary(matter: Matter): Promise<{
  summary: string;
  disclaimer: string;
  flags: string[];
}> {
  const events = listAudit(matter.id, 10).reverse();
  const flags = expiryFlags(matter);
  const timelineLines = events.map(
    (e) => `- ${e.occurredAt.slice(0, 10)}: ${e.eventType}${e.note ? ` — ${e.note}` : ""} (${e.actorName})`
  );

  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Summarize contract matter status for a business requester. Use ONLY dates and facts from the provided audit JSON. Do not invent dates. Plain language, 3-5 sentences.",
            },
            {
              role: "user",
              content: JSON.stringify({
                matterNumber: matter.matterNumber,
                status: matter.status,
                counterparty: matter.counterparty,
                custody: matter.physicalCustody,
                audit: events.map((e) => ({
                  at: e.occurredAt,
                  type: e.eventType,
                  note: e.note,
                })),
              }),
            },
          ],
          max_tokens: 300,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return { summary: text, disclaimer: DISCLAIMER, flags };
      }
    } catch {
      /* fall through */
    }
  }

  const summary = [
    `Matter ${matter.matterNumber} ("${matter.title}") is currently **${matter.status}**.`,
    `Counterparty: ${matter.counterparty}. Contract type: ${matter.contractType}.`,
    matter.physicalCustody
      ? `Physical custody: ${matter.physicalCustody}${matter.custodyNote ? ` (${matter.custodyNote})` : ""}.`
      : "Physical custody has not been recorded yet.",
    matter.printedCopyIssuedAt
      ? `Printed routing copy issued on ${matter.printedCopyIssuedAt.slice(0, 10)}.`
      : "Printed routing copy has not been recorded (required before Internal Review).",
    timelineLines.length
      ? `Recent activity:\n${timelineLines.join("\n")}`
      : "No audit events yet.",
    flags.length ? `Risk flags: ${flags.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { summary, disclaimer: DISCLAIMER, flags };
}