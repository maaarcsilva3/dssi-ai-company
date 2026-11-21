import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require";
import { AppShell } from "@/components/AppShell";
import { getLegalUsers } from "@/lib/matters/service";
import { getDb } from "@/lib/db";
import { matters } from "@/lib/db/schema";

export default async function ManagerPortfolioPage() {
  const user = await requireUser();
  if (user.role !== "manager" && user.role !== "admin") redirect("/403");

  const all = getDb().select().from(matters).all();
  const pool = all.filter((m) => m.status === "In Pool").length;
  const near = all.filter((m) => m.expiryBucket === "NearExpiry").length;
  const unknown = all.filter((m) => m.expiryBucket === "Unknown").length;
  const active = all.filter((m) => !["Completed"].includes(m.status)).length;

  const legalUsers = getLegalUsers();
  const rows = legalUsers.map((u) => {
    const owned = all.filter((m) => m.assigneeUserId === u.id && m.status !== "Completed");
    return {
      name: u.name,
      active: owned.length,
      inReview: owned.filter((m) => m.status === "Internal Review").length,
      onHold: owned.filter((m) => m.status === "On Hold").length,
      oldest:
        owned.length > 0
          ? Math.max(
              ...owned.map((m) =>
                Math.floor((Date.now() - new Date(m.createdAt).getTime()) / 86400000)
              )
            )
          : 0,
    };
  });

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold mb-6">Portfolio</h1>
      <PortfolioKpis active={active} near={near} unknown={unknown} pool={pool} />
      <h2 className="font-semibold mt-8 mb-3">Workload by assignee</h2>
      <div className="card overflow-x-auto">
        <table className="table-matters">
          <thead>
            <tr>
              <th>Assignee</th>
              <th>Active</th>
              <th>In review</th>
              <th>On hold</th>
              <th>Oldest open (days)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.active}</td>
                <td>{r.inReview}</td>
                <td>{r.onHold}</td>
                <td>{r.oldest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/manager/expiry" className="btn-outline inline-block mt-6 text-sm no-underline">
        View expiry watch →
      </Link>
    </AppShell>
  );
}

function PortfolioKpis({
  active,
  near,
  unknown,
  pool,
}: {
  active: number;
  near: number;
  unknown: number;
  pool: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Kpi label="Active matters" value={active} />
      <Kpi label="Near expiry" value={near} />
      <Kpi label="Unknown end date" value={unknown} />
      <Kpi label="Unassigned in pool" value={pool} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-semibold text-[var(--color-brand-primary)]">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}