"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import type { Matter } from "@/lib/db/schema";
import {
  changeStatusAction,
  updateCustodyAction,
  updateMetadataAction,
  recordPrintedAction,
  aiSummaryAction,
} from "@/app/actions/matters";

export function MatterEditor({
  matter,
  matterId,
  allowedTransitions,
  features,
}: {
  matter: Matter;
  matterId: string;
  allowedTransitions: string[];
  features: { digitalRoutingSlipEnabled: boolean; aiEnabled: boolean };
}) {
  const router = useRouter();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");

  async function onStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusError(null);
    const fd = new FormData(e.currentTarget);
    const res = await changeStatusAction(matterId, fd);
    if (res?.error) setStatusError(res.error);
    else router.refresh();
  }

  return (
    <EditorSections
      matter={matter}
      matterId={matterId}
      allowedTransitions={allowedTransitions}
      features={features}
      statusError={statusError}
      onStatus={onStatus}
      updateCustodyAction={updateCustodyAction}
      updateMetadataAction={updateMetadataAction}
      recordPrintedAction={recordPrintedAction}
      router={router}
      aiOpen={aiOpen}
      setAiOpen={setAiOpen}
      aiText={aiText}
      setAiText={setAiText}
      aiSummaryAction={aiSummaryAction}
    />
  );
}

function EditorSections(props: {
  matter: Matter;
  matterId: string;
  allowedTransitions: string[];
  features: { digitalRoutingSlipEnabled: boolean; aiEnabled: boolean };
  statusError: string | null;
  onStatus: (e: React.FormEvent<HTMLFormElement>) => void;
  updateCustodyAction: typeof updateCustodyAction;
  updateMetadataAction: typeof updateMetadataAction;
  recordPrintedAction: typeof recordPrintedAction;
  router: ReturnType<typeof useRouter>;
  aiOpen: boolean;
  setAiOpen: (v: boolean) => void;
  aiText: string;
  setAiText: (v: string) => void;
  aiSummaryAction: typeof aiSummaryAction;
}) {
  const {
    matter,
    matterId,
    allowedTransitions,
    features,
    statusError,
    onStatus,
    router,
    aiOpen,
    setAiOpen,
    aiText,
    setAiText,
  } = props;

  return (
    <EditorStack>
      <section className="card p-4">
        <h2 className="font-semibold mb-3">Change status</h2>
        <form onSubmit={onStatus} className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">
            Next status
            <select name="status" className="block mt-1 border rounded px-2 py-1.5" required>
              {allowedTransitions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {allowedTransitions.includes("On Hold") && (
            <label className="text-sm flex-1 min-w-[200px]">
              Hold reason
              <input name="onHoldReason" className="block mt-1 w-full border rounded px-2 py-1.5" />
            </label>
          )}
          <button type="submit" className="btn-primary text-sm">
            Update status
          </button>
        </form>
        {statusError && (
          <p className="text-sm text-[var(--color-danger)] mt-2" role="alert">
            {statusError}
          </p>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Custody &amp; location</h2>
        <form
          action={async (fd) => {
            await updateCustodyAction(matterId, fd);
            router.refresh();
          }}
          className="space-y-2 text-sm"
        >
          <input
            name="physicalCustody"
            defaultValue={matter.physicalCustody ?? ""}
            placeholder="Physical: with …"
            className="w-full border rounded px-2 py-1.5"
          />
          <input
            name="custodyNote"
            defaultValue={matter.custodyNote ?? ""}
            placeholder="Desk / shelf note"
            className="w-full border rounded px-2 py-1.5"
          />
          <button type="submit" className="btn-outline text-sm">
            Save custody
          </button>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-3">Artifacts &amp; metadata</h2>
        <form
          action={async (fd) => {
            await updateMetadataAction(matterId, fd);
            router.refresh();
          }}
          className="grid gap-2 text-sm sm:grid-cols-2"
        >
          <label className="sm:col-span-2">
            Google Doc URL
            <input
              name="googleDocUrl"
              defaultValue={matter.googleDocUrl ?? ""}
              className="w-full mt-1 border rounded px-2 py-1.5"
            />
          </label>
          <label>
            Latest artifact URL
            <input
              name="latestArtifactUrl"
              defaultValue={matter.latestArtifactUrl ?? ""}
              className="w-full mt-1 border rounded px-2 py-1.5"
            />
          </label>
          <label>
            Label
            <input
              name="latestArtifactLabel"
              defaultValue={matter.latestArtifactLabel ?? ""}
              className="w-full mt-1 border rounded px-2 py-1.5"
            />
          </label>
          <label>
            System of record
            <select name="systemOfRecord" defaultValue={matter.systemOfRecord ?? "gdocs"} className="w-full mt-1 border rounded px-2 py-1.5">
              <option value="gdocs">Google Docs</option>
              <option value="app">App upload</option>
              <option value="physical">Physical</option>
            </select>
          </label>
          <label>
            Effectivity end
            <input
              name="effectivityEnd"
              type="date"
              defaultValue={matter.effectivityEnd ?? ""}
              className="w-full mt-1 border rounded px-2 py-1.5"
            />
          </label>
          <label>
            Effectivity start
            <input
              name="effectivityStart"
              type="date"
              defaultValue={matter.effectivityStart ?? ""}
              className="w-full mt-1 border rounded px-2 py-1.5"
            />
          </label>
          <button type="submit" className="btn-outline text-sm sm:col-span-2">
            Save metadata
          </button>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold mb-2">Routing slip (LEG-FORM-5)</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Print-first workflow — wet signature blocks on generated form.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/legal/matters/${matterId}/routing-slip`} className="btn-outline text-sm no-underline" target="_blank">
            Preview &amp; print
          </Link>
        </div>
        <form
          action={async (fd) => {
            await recordPrintedAction(matterId, fd);
            router.refresh();
          }}
          className="mt-4 flex flex-wrap gap-2 items-end text-sm border-t pt-4"
        >
          <label>
            Printed copy issued date
            <input
              name="printedDate"
              type="date"
              data-testid="print-issued-date"
              defaultValue={matter.printedCopyIssuedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
              className="block mt-1 border rounded px-2 py-1.5"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              data-testid="print-issued-checkbox"
              checked={!!matter.printedCopyIssuedAt}
              readOnly
              disabled
            />
            {matter.printedCopyIssuedAt ? "Printed copy issued" : "Check after recording date"}
          </label>
          <button type="submit" className="btn-primary text-sm">
            Record printed copy issued
          </button>
        </form>
        {features.digitalRoutingSlipEnabled && (
          <p className="text-xs mt-3 p-2 bg-blue-50 border border-blue-200">
            Demo: digital routing approvals enabled (staging).
          </p>
        )}
      </section>

      {features.aiEnabled && (
        <section className="ai-panel">
          <h2 className="font-semibold text-sm">Assistive AI</h2>
          <button
            type="button"
            className="btn-outline text-sm mt-2"
            onClick={async () => {
              const res = await aiSummaryAction(matterId);
              setAiText(res.summary);
              setAiOpen(true);
            }}
          >
            Generate status summary
          </button>
          {aiOpen && (
            <div className="mt-3 text-sm">
              <pre className="whitespace-pre-wrap">{aiText}</pre>
              <p className="text-xs mt-2 text-[var(--color-text-muted)]">
                Assistive only. Not legal advice. An attorney must review all decisions.
              </p>
              <button type="button" className="text-xs underline mt-1" onClick={() => setAiOpen(false)}>
                Close
              </button>
            </div>
          )}
        </section>
      )}
    </EditorStack>
  );
}

function EditorStack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}