"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require";
import {
  createIntake,
  claimMatter,
  assignMatter,
  transitionStatus,
  updateCustody,
  updateMatterFields,
  recordPrintedCopy,
  getMatterById,
  addAudit,
} from "@/lib/matters/service";
import { canReadMatter, canWriteMatter, canAssign } from "@/lib/matters/acl";
import { generateStatusSummary } from "@/lib/ai/summary";

export async function submitIntake(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "requester") throw new Error("Only requesters can submit");
  const matter = createIntake({
    entityId: formData.get("entityId") as string,
    departmentId: formData.get("departmentId") as string,
    title: formData.get("title") as string,
    contractType: formData.get("contractType") as string,
    counterparty: formData.get("counterparty") as string,
    proponentName: formData.get("proponentName") as string,
    priority: (formData.get("priority") as string) || "normal",
    googleDocUrl: (formData.get("googleDocUrl") as string) || undefined,
    internalNotes: (formData.get("internalNotes") as string) || undefined,
    submittedBy: user,
  });
  revalidatePath("/request");
  return matter.id;
}

export async function claimMatterAction(matterId: string) {
  const user = await requireUser();
  if (!canAssign(user)) throw new Error("Forbidden");
  claimMatter(matterId, user);
  revalidatePath("/legal/pool");
  revalidatePath(`/legal/matters/${matterId}`);
}

export async function assignMatterAction(matterId: string, assigneeId: string) {
  const user = await requireUser();
  if (!["assigner", "admin"].includes(user.role)) throw new Error("Forbidden");
  assignMatter(matterId, assigneeId, user);
  revalidatePath("/legal/pool");
  revalidatePath(`/legal/matters/${matterId}`);
}

export async function changeStatusAction(matterId: string, formData: FormData) {
  const user = await requireUser();
  if (!canWriteMatter(user)) throw new Error("Forbidden");
  const toStatus = formData.get("status") as string;
  const onHoldReason = (formData.get("onHoldReason") as string) || undefined;
  try {
    transitionStatus(matterId, toStatus, user, onHoldReason);
  } catch (e) {
    const err = e as Error;
    return { error: err.message };
  }
  revalidatePath(`/legal/matters/${matterId}`);
  revalidatePath(`/request/${matterId}`);
  return { ok: true };
}

export async function updateCustodyAction(matterId: string, formData: FormData) {
  const user = await requireUser();
  if (!canWriteMatter(user)) throw new Error("Forbidden");
  updateCustody(
    matterId,
    formData.get("physicalCustody") as string,
    (formData.get("custodyNote") as string) || "",
    user
  );
  revalidatePath(`/legal/matters/${matterId}`);
}

export async function updateMetadataAction(matterId: string, formData: FormData) {
  const user = await requireUser();
  if (!canWriteMatter(user)) throw new Error("Forbidden");
  updateMatterFields(
    matterId,
    {
      googleDocUrl: (formData.get("googleDocUrl") as string) || undefined,
      latestArtifactUrl: (formData.get("latestArtifactUrl") as string) || undefined,
      latestArtifactLabel: (formData.get("latestArtifactLabel") as string) || undefined,
      systemOfRecord: (formData.get("systemOfRecord") as string) || undefined,
      effectivityStart: (formData.get("effectivityStart") as string) || undefined,
      effectivityEnd: (formData.get("effectivityEnd") as string) || undefined,
    },
    user
  );
  revalidatePath(`/legal/matters/${matterId}`);
  revalidatePath("/manager/expiry");
}

export async function recordPrintedAction(matterId: string, formData: FormData) {
  const user = await requireUser();
  if (!canWriteMatter(user)) throw new Error("Forbidden");
  const date = (formData.get("printedDate") as string) || undefined;
  recordPrintedCopy(matterId, user, date);
  revalidatePath(`/legal/matters/${matterId}`);
}

export async function aiSummaryAction(matterId: string) {
  const user = await requireUser();
  const matter = getMatterById(matterId);
  if (!matter || !canReadMatter(user, matter)) throw new Error("Forbidden");
  const result = await generateStatusSummary(matter);
  addAudit(matterId, user, "ai_summary_requested", null, { flags: result.flags });
  return result;
}