import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require";
import { AppShell } from "@/components/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { StatusStepper } from "@/components/StatusStepper";
import { MatterTimeline } from "@/components/MatterTimeline";
import { getMatterById, listAudit } from "@/lib/matters/service";
import { canReadMatter } from "@/lib/matters/acl";
import { RequesterAiPanel } from "./RequesterAiPanel";

export default async function RequestStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const matter = getMatterById(id);
  if (!matter) notFound();
  if (!canReadMatter(user, matter)) redirect("/403");
  const events = listAudit(id, 10);
  return (
    <AppShell user={user}>
      {sp.submitted === "1" && (
        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm">
          Request submitted. Matter <strong className="font-mono-matter">{matter.matterNumber}</strong>{" "}
          is now in the assignment pool. A receipt email was sent (see server console in demo).
        </div>
      )}
      <p className="font-mono-matter text-sm text-[var(--color-text-muted)]" data-testid="matter-number">
        {matter.matterNumber}
      </p>
      <h1 className="text-2xl font-semibold mt-1">{matter.title}</h1>
      <div className="mt-2">
        <StatusChip status={matter.status} />
      </div>
      <StatusStepper current={matter.status} />
      <RequestLayout matter={matter} events={events} id={id} />
    </AppShell>
  );
}

function RequestLayout({
  matter,
  events,
  id,
}: {
  matter: NonNullable<ReturnType<typeof getMatterById>>;
  events: ReturnType<typeof listAudit>;
  id: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-6">
      <div className="lg:col-span-2 space-y-4">
        <RequestMetaCard matter={matter} />
        <RequesterAiPanel matterId={id} />
      </div>
      <div className="card p-4">
        <h2 className="font-semibold mb-3">Timeline</h2>
        <MatterTimeline events={events} />
      </div>
    </div>
  );
}

function RequestMetaCard({ matter }: { matter: NonNullable<ReturnType<typeof getMatterById>> }) {
  return (
    <dl className="card p-4 grid sm:grid-cols-2 gap-3 text-sm">
      <div>
        <dt className="text-[var(--color-text-muted)]">Counterparty</dt>
        <dd>{matter.counterparty}</dd>
      </div>
      <div>
        <dt className="text-[var(--color-text-muted)]">Contract type</dt>
        <dd>{matter.contractType}</dd>
      </div>
      <div>
        <dt className="text-[var(--color-text-muted)]">Physical custody</dt>
        <dd>{matter.physicalCustody ?? "—"}</dd>
      </div>
      {matter.onHoldReason && (
        <div className="sm:col-span-2">
          <dt className="text-[var(--color-text-muted)]">On hold reason</dt>
          <dd>{matter.onHoldReason}</dd>
        </div>
      )}
    </dl>
  );
}