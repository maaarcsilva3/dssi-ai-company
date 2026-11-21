import type { AuditEvent } from "@/lib/db/schema";

const EVENT_LABELS: Record<string, string> = {
  status_change: "Status changed",
  custody_update: "Custody updated",
  assignment: "Assignment",
  intake_submitted: "Request submitted",
  routing_print: "Printed copy recorded",
  metadata_update: "Metadata updated",
  ai_summary_requested: "AI summary requested",
};

export function MatterTimeline({ events }: { events: AuditEvent[] }) {
  const ordered = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );
  return (
    <ol className="space-y-3 border-l-2 border-[var(--color-border-subtle)] pl-4 ml-1">
      {ordered.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--color-brand-primary)]" />
          <p className="text-sm font-medium">{EVENT_LABELS[e.eventType] ?? e.eventType}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {e.actorName} · {new Date(e.occurredAt).toLocaleString()}
          </p>
          {e.afterJson && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-mono-matter">
              {e.afterJson.length > 120 ? `${e.afterJson.slice(0, 120)}…` : e.afterJson}
            </p>
          )}
          {e.note && <p className="text-xs mt-0.5">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}