import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require";
import { AppShell } from "@/components/AppShell";
import { getPoolMatters, searchMatters } from "@/lib/matters/service";
import { isLegalRole } from "@/lib/matters/acl";

export default async function LegalHomePage() {
  const user = await requireUser();
  if (!isLegalRole(user.role)) redirect("/403");
  const pool = getPoolMatters();
  const active = searchMatters({ assigneeId: user.id, statuses: ["Assigned", "Drafting", "Internal Review", "Final Approval", "Notarization"] });
  const needsPrint = searchMatters({ assigneeId: user.id, status: "Drafting" }).filter(
    (m) => !m.printedCopyIssuedAt
  );
  const missingExpiry = searchMatters({ assigneeId: user.id }).filter((m) => !m.effectivityEnd);
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold mb-6">Work queue</h1>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link href="/legal/pool" className="card p-5 hover:border-[var(--color-brand-primary)] block">
          <p className="text-3xl font-semibold text-[var(--color-brand-primary)]">{pool.length}</p>
          <p className="text-sm font-medium">In pool</p>
        </Link>
        <div className="card p-5">
          <p className="text-3xl font-semibold">{active.length}</p>
          <p className="text-sm font-medium">My active matters</p>
        </div>
      </div>
      <h2 className="font-semibold text-sm text-[var(--color-text-secondary)] mb-2">Needs attention</h2>
      <ul className="text-sm space-y-1 text-[var(--color-text-secondary)]">
        <li>Print gate blocking review: {needsPrint.length}</li>
        <li>Missing expiry date: {missingExpiry.length}</li>
        <li>Custody not set: {active.filter((m) => !m.physicalCustody).length}</li>
      </ul>
    </AppShell>
  );
}