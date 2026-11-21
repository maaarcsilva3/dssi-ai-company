import { STATUSES } from "@/lib/matters/status-machine";

const FLOW = STATUSES.filter((s) => s !== "On Hold");

export function StatusStepper({ current }: { current: string }) {
  const idx = FLOW.indexOf(current as (typeof FLOW)[number]);
  return (
    <nav aria-label="Matter status stages" className="flex flex-wrap gap-1 text-xs sm:text-sm mb-4">
      {FLOW.map((stage, i) => {
        const state = i < idx ? "past" : i === idx ? "current" : "future";
        return (
          <span key={stage} className="flex items-center gap-1">
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={
                state === "current"
                  ? "font-semibold text-[var(--color-brand-primary)]"
                  : state === "past"
                    ? "text-[var(--color-text-secondary)]"
                    : "text-[var(--color-text-muted)]"
              }
            >
              {stage}
            </span>
            {i < FLOW.length - 1 && (
              <span className="text-[var(--color-text-muted)] mx-0.5" aria-hidden>
                →
              </span>
            )}
          </span>
        );
      })}
      {current === "On Hold" && (
        <span className="ml-2 font-semibold text-amber-700">(On Hold)</span>
      )}
    </nav>
  );
}