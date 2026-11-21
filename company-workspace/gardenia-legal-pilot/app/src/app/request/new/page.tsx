import { requireUser } from "@/lib/auth/require";
import { AppShell } from "@/components/AppShell";
import { getAllEntities, getAllDepartments } from "@/lib/matters/service";
import { IntakeForm } from "./IntakeForm";

export default async function NewRequestPage() {
  const user = await requireUser();
  const entities = getAllEntities();
  const departments = getAllDepartments();
  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold mb-2">New contract request</h1>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Legal will receive this in the assignment pool within seconds.
      </p>
      <IntakeForm
        entities={entities}
        departments={departments}
        defaultDepartmentId={user.departmentId ?? undefined}
      />
    </AppShell>
  );
}