"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitIntake } from "@/app/actions/matters";

type Entity = { id: string; code: string; name: string };
type Dept = { id: string; entityId: string; code: string; name: string };

export function IntakeForm({
  entities,
  departments,
  defaultDepartmentId,
}: {
  entities: Entity[];
  departments: Dept[];
  defaultDepartmentId?: string;
}) {
  const router = useRouter();
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const depts = departments.filter((d) => d.entityId === entityId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set("entityId", entityId);
    try {
      const id = await submitIntake(fd);
      router.push(`/request/${id}?submitted=1`);
    } catch (err) {
      alert((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 max-w-2xl space-y-6">
      <section>
        <h2 className="text-[var(--text-section-title,1.125rem)] font-semibold mb-3">Request info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Entity <span className="text-[var(--color-danger)]">*</span>
            <select
              className="mt-1 w-full border rounded-md px-3 py-2 border-[var(--color-border-strong)]"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              required
            >
              {entities.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Department <span className="text-[var(--color-danger)]">*</span>
            <select
              name="departmentId"
              className="mt-1 w-full border rounded-md px-3 py-2 border-[var(--color-border-strong)]"
              defaultValue={defaultDepartmentId}
              required
            >
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            Title / summary <span className="text-[var(--color-danger)]">*</span>
            <input
              name="title"
              className="mt-1 w-full border rounded-md px-3 py-2 border-[var(--color-border-strong)]"
              required
            />
          </label>
          <label className="block text-sm">
            Contract type <span className="text-[var(--color-danger)]">*</span>
            <select
              name="contractType"
              className="mt-1 w-full border rounded-md px-3 py-2 border-[var(--color-border-strong)]"
              required
            >
              {["NDA", "Supply Agreement", "Lease", "MOA", "Service Agreement", "Distribution", "Other"].map(
                (t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="block text-sm">
            Priority
            <select
              name="priority"
              className="mt-1 w-full border rounded-md px-3 py-2 border-[var(--color-border-strong)]"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        </div>
      </section>
      <section>
        <h2 className="font-semibold mb-3">Parties</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            Counterparty <span className="text-[var(--color-danger)]">*</span>
            <input
              name="counterparty"
              className="mt-1 w-full border rounded-md px-3 py-2 border-[var(--color-border-strong)]"
              required
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            Proponent (dept contact) <span className="text-[var(--color-danger)]">*</span>
            <input
              name="proponentName"
              className="mt-1 w-full border rounded-md px-3 py-2 border-[var(--color-border-strong)]"
              required
            />
          </label>
        </div>
      </section>
      <section>
        <h2 className="font-semibold mb-3">Attachments &amp; links</h2>
        <label className="block text-sm">
          Google Doc URL (optional)
          <input
            name="googleDocUrl"
            type="url"
            placeholder="https://docs.google.com/..."
            className="mt-1 w-full border rounded-md px-3 py-2 border-[var(--color-border-strong)]"
          />
        </label>
        <label className="block text-sm mt-3">
          Notes to Legal
          <textarea
            name="internalNotes"
            rows={3}
            className="mt-1 w-full border rounded-md px-3 py-2 border-[var(--color-border-strong)]"
          />
        </label>
      </section>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}