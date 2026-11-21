"use client";

import { useState } from "react";
import { aiSummaryAction } from "@/app/actions/matters";

export function RequesterAiPanel({ matterId }: { matterId: string }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await aiSummaryAction(matterId);
      setSummary(res.summary);
      setFlags(res.flags);
      setDisclaimer(res.disclaimer);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-panel">
      <h3 className="font-semibold text-sm">Assistive tools</h3>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">
        On-demand only — not legal advice.
      </p>
      <button type="button" className="btn-outline text-sm mt-3" onClick={generate} disabled={loading}>
        {loading ? "Generating…" : "Copy status summary"}
      </button>
      {open && summary && (
        <SummaryModal summary={summary} flags={flags} disclaimer={disclaimer} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

function SummaryModal({
  summary,
  flags,
  disclaimer,
  onClose,
}: {
  summary: string;
  flags: string[];
  disclaimer: string;
  onClose: () => void;
}) {
  async function copy() {
    await navigator.clipboard.writeText(summary);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-auto p-4 shadow-lg">
        <h4 className="font-semibold">Status summary</h4>
        {flags.length > 0 && (
          <p className="text-xs text-[var(--color-warning)] mt-2">Flags: {flags.join(", ")}</p>
        )}
        <pre className="whitespace-pre-wrap text-sm mt-3 font-sans">{summary}</pre>
        <p className="text-xs border-t mt-4 pt-3 text-[var(--color-text-muted)]">{disclaimer}</p>
        <SummaryModalActions copy={copy} onClose={onClose} />
      </div>
    </div>
  );
}

function SummaryModalActions({ copy, onClose }: { copy: () => void; onClose: () => void }) {
  return (
    <div className="flex gap-2 mt-4">
      <button type="button" className="btn-primary text-sm" onClick={copy}>
        Copy to clipboard
      </button>
      <button type="button" className="btn-outline text-sm" onClick={onClose}>
        Close
      </button>
    </div>
  );
}