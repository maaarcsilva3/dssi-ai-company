import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/require";
import { AppShell } from "@/components/AppShell";
import { getMatterById, listAudit } from "@/lib/matters/service";
import { canReadMatter, isLegalRole } from "@/lib/matters/acl";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { MatterDetailView } from "@/components/MatterDetailView";
import { getFeatures } from "@/lib/config/features";
import { allowedTransitions } from "@/lib/matters/status-machine";
import { expiryFlags } from "@/lib/matters/expiry";

export default async function LegalMatterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const matter = getMatterById(id);
  if (!matter) notFound();
  if (!canReadMatter(user, matter)) redirect("/403");
  const events = listAudit(id, 50);
  const assignee = matter.assigneeUserId
    ? getDb().select().from(users).where(eq(users.id, matter.assigneeUserId)).get()
    : null;
  const readOnly = user.role === "manager";
  const features = getFeatures();
  const transitions = allowedTransitions(matter.status, {
    printedCopyIssued: !!matter.printedCopyIssuedAt,
  });
  const flags = expiryFlags(matter);

  return (
    <AppShell user={user}>
      <MatterDetailView
        matter={matter}
        events={events}
        assigneeName={assignee?.name}
        readOnly={readOnly}
        canEdit={isLegalRole(user.role) && !readOnly}
        features={features}
        allowedTransitions={transitions}
        expiryFlags={flags}
        matterId={id}
      />
    </AppShell>
  );
}