const STATUS_COLORS: Record<string, string> = {
  Submitted: "#6b7280",
  "In Pool": "#2563eb",
  Assigned: "#0d9488",
  Drafting: "#ca8a04",
  "Internal Review": "#9333ea",
  "Final Approval": "#1e4d3a",
  Notarization: "#4b5563",
  Completed: "#15803d",
  "On Hold": "#b45309",
};

export function StatusChip({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#6b7280";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" data-testid="status-chip">
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span>{status}</span>
    </span>
  );
}