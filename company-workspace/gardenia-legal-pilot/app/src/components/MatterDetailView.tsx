import type { Matter, AuditEvent } from "@/lib/db/schema";
import { StatusChip } from "./StatusChip";
import { StatusStepper } from "./StatusStepper";
import { MatterTimeline } from "./MatterTimeline";
import { MatterEditor } from "./MatterEditor";

export function MatterDetailView({
  matter,
  events,
  assigneeName,
  readOnly,
  canEdit,
  features,
  allowedTransitions,
  expiryFlags,
  matterId,
}: {
  matter: Matter;
  events: AuditEvent[];
  assigneeName?: string;
  readOnly: boolean;
  canEdit: boolean;
  features: { digitalRoutingSlipEnabled: boolean; aiEnabled: boolean };
  allowedTransitions: string[];
  expiryFlags: string[];
  matterId: string;
}) {
  return (
    <div>
      <p className="font-mono-matter text-sm text-[var(--color-text-muted)]" data-testid="matter-number">
        {matter.matterNumber}
      </p>
      <h1 className="text-2xl font-semibold mt-1">{matter.title}</h1>
      <MatterStatusRow matter={matter} assigneeName={assigneeName} />
      <StatusStepper current={matter.status} />
      {(matter.physicalCustody || canEdit) && (
        <div className="custody-strip my-4 text-sm">
          <strong>Physical custody:</strong> {matter.physicalCustody ?? "Not recorded"}{" "}
          {matter.custodyNote && <span className="text-[var(--color-text-muted)]">({matter.custodyNote})</span>}
        </div>
      )}
      {expiryFlags.length > 0 && (
        <div className="mb-4 p-3 rounded border border-amber-300 bg-amber-50 text-sm text-amber-900">
          Expiry risk flags: {expiryFlags.join(", ")}
        </div>
      )}
      {!matter.printedCopyIssuedAt && matter.status === "Drafting" && canEdit && (
        <div className="mb-4 p-3 rounded border border-[var(--color-danger)] bg-red-50 text-sm">
          Print gate: record printed copy issued before advancing to Internal Review.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <MatterMetaCard matter={matter} />
          {!canEdit && readOnly && (
            <p className="text-sm text-[var(--color-text-muted)]">Read-only manager view.</p>
          )}
          {canEdit && (
            <MatterEditor
              matter={matter}
              matterId={matterId}
              allowedTransitions={allowedTransitions}
              features={features}
            />
          )}
        </div>
        <div className="card p-4">
          <h2 className="font-semibold mb-3">Timeline &amp; audit</h2>
          <MatterTimeline events={events} />
        </div>
      </div>
    </div>
  );
}

function MatterStatusRow({ matter, assigneeName }: { matter: Matter; assigneeName?: string }) {
  return (
    <p className="flex flex-wrap gap-3 items-center mt-2 text-sm">
      <StatusChip status={matter.status} />
      {assigneeName && (
        <span className="text-[var(--color-text-secondary)]">Assignee: {assigneeName}</span>
      )}
      {matter.onHoldReason && (
        <span className="text-amber-800">Hold: {matter.onHoldReason}</span>
      )}
    </p>
  );
}

function MatterMetaCard({ matter }: { matter: Matter }) {
  return (
    <dl className="card p-4 grid sm:grid-cols-2 gap-3 text-sm">
      <MetaItem label="Counterparty" value={matter.counterparty} />
      <MetaItem label="Contract type" value={matter.contractType} />
      <MetaItem label="Proponent" value={matter.proponentName} />
      <MetaItem label="Expiry bucket" value={matter.expiryBucket ?? "Unknown"} />
      <MetaItem label="Effectivity end" value={matter.effectivityEnd ?? "—"} />
      <MetaItem label="System of record" value={matter.systemOfRecord ?? "—"} />
      {matter.googleDocUrl && (
        <GdocLink url={matter.googleDocUrl} />
      )}
      {matter.latestArtifactUrl && (
        <div className="sm:col-span-2">
          <dt className="text-[var(--color-text-muted)]">Latest artifact</dt>
          <dd>
            <a href={matter.latestArtifactUrl} className="text-[var(--color-brand-primary)]" target="_blank" rel="noreferrer">
              {matter.latestArtifactLabel ?? matter.latestArtifactUrl}
            </a>
          </dd>
        </div>
      )}
    </dl>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-text-muted)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function GdocLink({ url }: { url: string }) {
  return (
    <div className="sm:col-span-2">
      <dt className="text-[var(--color-text-muted)]">Google Doc (drafting)</dt>
      <dd>
        <a href={url} target="_blank" rel="noreferrer" className="text-[var(--color-brand-primary)] font-medium">
          Open Google Doc ↗
        </a>
      </dd>
    </div>
  );
}