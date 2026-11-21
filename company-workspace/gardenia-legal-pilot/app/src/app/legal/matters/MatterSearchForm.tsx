"use client";

import { useRouter } from "next/navigation";

export function MatterSearchForm({
  entities,
  departments,
  legalUsers,
  initial,
}: {
  entities: { id: string; name: string }[];
  departments: { id: string; name: string; entityId: string }[];
  legalUsers: { id: string; name: string }[];
  initial: Record<string, string | undefined>;
}) {
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string" && v) params.set(k, v);
    }
    router.push(`/legal/matters?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
      <label className="sm:col-span-2 lg:col-span-4">
        Keyword
        <input
          name="q"
          defaultValue={initial.q}
          placeholder="Title, counterparty, matter #"
          className="mt-1 w-full border rounded px-2 py-1.5 border-[var(--color-border-strong)]"
        />
      </label>
      <label>
        Status
        <select name="status" defaultValue={initial.status ?? ""} className="mt-1 w-full border rounded px-2 py-1.5">
          <option value="">All</option>
          {[
            "Submitted",
            "In Pool",
            "Assigned",
            "Drafting",
            "Internal Review",
            "Final Approval",
            "Notarization",
            "Completed",
            "On Hold",
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        Expiry bucket
        <select
          name="expiryBucket"
          defaultValue={initial.expiryBucket ?? ""}
          className="mt-1 w-full border rounded px-2 py-1.5"
        >
          <option value="">All</option>
          {["Active", "NearExpiry", "Expired", "Unknown"].map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <label>
        Entity
        <select name="entityId" defaultValue={initial.entityId ?? ""} className="mt-1 w-full border rounded px-2 py-1.5">
          <option value="">All</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Assignee
        <select name="assigneeId" defaultValue={initial.assigneeId ?? ""} className="mt-1 w-full border rounded px-2 py-1.5">
          <option value="">All</option>
          {legalUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Contract type
        <input name="contractType" defaultValue={initial.contractType} className="mt-1 w-full border rounded px-2 py-1.5" />
      </label>
      <div className="flex items-end">
        <button type="submit" className="btn-primary text-sm">
          Search
        </button>
      </div>
    </form>
  );
}