import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/require";
import { AppShell } from "@/components/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { getDb } from "@/lib/db";
import { matters } from "@/lib/db/schema";

export default async function RequesterHomePage() {
  const user = await requireUser();
  if (user.role !== "requester") {
    return (
      <p className="p-6">
        <Link href="/">Go home</Link>
      </p>
    );
  }
  const list = user.departmentId
    ? getDb()
        .select()
        .from(matters)
        .where(eq(matters.departmentId, user.departmentId))
        .orderBy(desc(matters.updatedAt))
        .all()
    : [];
  return (
    <AppShell user={user}>
      <div className="flex justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">My contract requests</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Track status without emailing Legal
          </p>
        </div>
        <Link href="/request/new" className="btn-primary text-sm no-underline">
          New request
        </Link>
      </div>
      {list.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">No requests yet.</p>
          <Link href="/request/new" className="btn-primary inline-block mt-4 text-sm">
            Submit your first request
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-matters">
            <thead>
              <tr>
                <th>Matter #</th>
                <th>Title</th>
                <th>Counterparty</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td className="font-mono-matter">
                    <Link href={`/request/${m.id}`} className="text-[var(--color-brand-primary)]">
                      {m.matterNumber}
                    </Link>
                  </td>
                  <td>{m.title}</td>
                  <td>{m.counterparty}</td>
                  <td>
                    <StatusChip status={m.status} />
                  </td>
                  <td className="text-[var(--color-text-muted)]">
                    {new Date(m.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}