import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require";
import { AppShell } from "@/components/AppShell";
import { getPoolMatters, getAllDepartments, getLegalUsers } from "@/lib/matters/service";
import { canAssign, isLegalRole } from "@/lib/matters/acl";
import { PoolActions } from "./PoolActions";

export default async function PoolPage() {
  const user = await requireUser();
  if (!isLegalRole(user.role)) redirect("/403");
  const pool = getPoolMatters();
  const depts = Object.fromEntries(getAllDepartments().map((d) => [d.id, d.name]));
  const legalUsers = getLegalUsers();
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold mb-2">Assignment pool</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Unassigned matters — claim or assign to legal staff.
      </p>
      {pool.length === 0 ? (
        <div className="card p-8 text-center text-[var(--color-text-secondary)]">
          No contracts waiting in the pool.{" "}
          <Link href="/legal/matters" className="text-[var(--color-brand-primary)]">
            Search matters
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-matters">
            <thead>
              <tr>
                <th>Matter #</th>
                <th>Title</th>
                <th>Dept</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Submitted</th>
                {canAssign(user) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pool.map((m) => (
                <tr key={m.id}>
                  <td className="font-mono-matter">{m.matterNumber}</td>
                  <td>
                    <Link href={`/legal/matters/${m.id}`} className="text-[var(--color-brand-primary)]">
                      {m.title}
                    </Link>
                  </td>
                  <td>{depts[m.departmentId] ?? "—"}</td>
                  <td>{m.contractType}</td>
                  <td>{m.priority}</td>
                  <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                  {canAssign(user) && (
                    <td>
                      <PoolActions
                        matterId={m.id}
                        canManualAssign={user.role === "assigner" || user.role === "admin"}
                        legalUsers={legalUsers.map((u) => ({ id: u.id, name: u.name }))}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}