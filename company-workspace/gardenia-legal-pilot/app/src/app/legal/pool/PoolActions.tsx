"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimMatterAction, assignMatterAction } from "@/app/actions/matters";

export function PoolActions({
  matterId,
  canManualAssign,
  legalUsers,
}: {
  matterId: string;
  canManualAssign: boolean;
  legalUsers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [assignee, setAssignee] = useState(legalUsers[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  async function claim() {
    setBusy(true);
    await claimMatterAction(matterId);
    router.refresh();
    router.push(`/legal/matters/${matterId}`);
  }

  async function assign() {
    setBusy(true);
    await assignMatterAction(matterId, assignee);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      <button
        type="button"
        data-testid="pool-claim"
        className="btn-primary text-xs py-1 px-2"
        disabled={busy}
        onClick={claim}
      >
        Claim
      </button>
      {canManualAssign && (
        <div className="flex gap-1 mt-1">
          <select
            className="text-xs border rounded flex-1"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            {legalUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn-outline text-xs py-1" disabled={busy} onClick={assign}>
            Assign
          </button>
        </div>
      )}
    </div>
  );
}