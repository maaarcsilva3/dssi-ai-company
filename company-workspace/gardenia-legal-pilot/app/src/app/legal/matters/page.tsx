import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require";
import { AppShell } from "@/components/AppShell";
import { searchMatters, getAllDepartments, getAllEntities, getLegalUsers } from "@/lib/matters/service";
import { isLegalRole } from "@/lib/matters/acl";
import { StatusChip } from "@/components/StatusChip";
import { MatterSearchForm } from "./MatterSearchForm";

export default async function MattersSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  if (!isLegalRole(user.role) && user.role !== "manager") redirect("/403");
  const sp = await searchParams;
  const results = searchMatters({
    q: sp.q,
    status: sp.status,
    entityId: sp.entityId,
    departmentId: sp.departmentId,
    contractType: sp.contractType,
    expiryBucket: sp.expiryBucket,
    assigneeId: sp.assigneeId,
  });
  const depts = Object.fromEntries(getAllDepartments().map((d) => [d.id, d.name]));
  const entities = getAllEntities();
  const legalUsers = getLegalUsers();
  const basePath = user.role === "manager" ? "/manager" : "/legal";
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold mb-4">Matters</h1>
      <MatterSearchForm
        entities={entities}
        departments={getAllDepartments()}
        legalUsers={legalUsers.map((u) => ({ id: u.id, name: u.name }))}
        initial={sp}
      />
      <p className="text-sm text-[var(--color-text-muted)] my-3">{results.length} result(s)</p>
      <div className="card overflow-x-auto">
        <table className="table-matters">
          <thead>
            <tr>
              <th>Matter #</th>
              <th>Title</th>
              <th>Dept</th>
              <th>Status</th>
              <th>Expiry</th>
              <th>Counterparty</th>
            </tr>
          </thead>
          <tbody>
            {results.map((m) => (
              <tr key={m.id}>
                <td className="font-mono-matter">
                  <Link
                    href={`${basePath}/matters/${m.id}`}
                    className="text-[var(--color-brand-primary)]"
                  >
                    {m.matterNumber}
                  </Link>
                </td>
                <td>{m.title}</td>
                <td>{depts[m.departmentId]}</td>
                <td>
                  <StatusChip status={m.status} />
                </td>
                <td>{m.expiryBucket}</td>
                <td>{m.counterparty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}