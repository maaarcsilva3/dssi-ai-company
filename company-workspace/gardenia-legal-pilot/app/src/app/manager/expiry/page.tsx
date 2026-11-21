import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require";
import { AppShell } from "@/components/AppShell";
import { searchMatters, getLegalUsers } from "@/lib/matters/service";
import { daysRemaining } from "@/lib/matters/expiry";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export default async function ExpiryWatchPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string }>;
}) {
  const user = await requireUser();
  if (!["manager", "legal", "admin"].includes(user.role)) redirect("/403");
  const sp = await searchParams;
  const bucket = sp.bucket ?? "NearExpiry";
  const list = searchMatters({ expiryBucket: bucket });

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold mb-2">Expiry watch</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-4">
        Fixed pilot thresholds: Near expiry = ≤90 days · Missing end dates flagged separately
      </p>
      <div className="flex gap-2 mb-4 text-sm">
        {["NearExpiry", "Unknown", "Expired", "Active"].map((b) => (
          <Link
            key={b}
            href={`/manager/expiry?bucket=${b}`}
            className={`px-3 py-1 rounded border ${
              bucket === b ? "bg-[var(--color-brand-primary)] text-white border-transparent" : "border-[var(--color-border-subtle)]"
            }`}
          >
            {b}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="table-matters">
          <thead>
            <tr>
              <th>Matter #</th>
              <th>Title</th>
              <th>Counterparty</th>
              <th>End date</th>
              <th>Days left</th>
              <th>Assignee</th>
              <th>Custody</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => {
              const assignee = m.assigneeUserId
                ? getDb().select().from(users).where(eq(users.id, m.assigneeUserId)).get()
                : null;
              const days = daysRemaining(m.effectivityEnd);
              return (
                <tr key={m.id}>
                  <td className="font-mono-matter">
                    <Link href={`/manager/matters/${m.id}`} className="text-[var(--color-brand-primary)]">
                      {m.matterNumber}
                    </Link>
                  </td>
                  <td>{m.title}</td>
                  <td>{m.counterparty}</td>
                  <td>{m.effectivityEnd ?? "—"}</td>
                  <td>{days ?? "—"}</td>
                  <td>{assignee?.name ?? "—"}</td>
                  <td className="text-xs">{m.physicalCustody ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && (
          <p className="p-6 text-center text-[var(--color-text-muted)] text-sm">No matters in this bucket.</p>
        )}
      </div>
    </AppShell>
  );
}