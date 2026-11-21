export const STATUSES = [
  "Submitted",
  "In Pool",
  "Assigned",
  "Drafting",
  "Internal Review",
  "Final Approval",
  "Notarization",
  "Completed",
  "On Hold",
] as const;

export type MatterStatus = (typeof STATUSES)[number];

const TRANSITIONS: Record<string, MatterStatus[]> = {
  Submitted: ["In Pool"],
  "In Pool": ["Assigned", "On Hold"],
  Assigned: ["Drafting", "On Hold", "In Pool"],
  Drafting: ["Internal Review", "On Hold"],
  "Internal Review": ["Final Approval", "Drafting", "On Hold"],
  "Final Approval": ["Notarization", "Completed", "On Hold"],
  Notarization: ["Completed", "On Hold"],
  Completed: [],
  "On Hold": ["In Pool", "Assigned", "Drafting", "Internal Review", "Final Approval", "Notarization"],
};

export function allowedTransitions(
  status: string,
  opts?: { printedCopyIssued: boolean }
): MatterStatus[] {
  const next = TRANSITIONS[status] ?? [];
  if (!opts?.printedCopyIssued) {
    return next.filter((s) => {
      if (s === "Internal Review" && status === "Drafting") return false;
      return true;
    });
  }
  return next;
}

export function canTransition(
  from: string,
  to: string,
  opts: { printedCopyIssued: boolean; onHoldReason?: string }
): { ok: boolean; error?: string } {
  const allowed = allowedTransitions(from, { printedCopyIssued: opts.printedCopyIssued });
  if (!allowed.includes(to as MatterStatus)) {
    if (to === "Internal Review" && from === "Drafting" && !opts.printedCopyIssued) {
      return {
        ok: false,
        error:
          "Cannot advance to Internal Review until printed copy is issued (routing slip milestone).",
      };
    }
    return { ok: false, error: `Transition from "${from}" to "${to}" is not allowed.` };
  }
  if (to === "On Hold" && !opts.onHoldReason?.trim()) {
    return { ok: false, error: "On Hold requires a short reason." };
  }
  return { ok: true };
}