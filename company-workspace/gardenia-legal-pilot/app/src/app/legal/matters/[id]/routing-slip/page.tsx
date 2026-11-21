import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/require";
import { getMatterById } from "@/lib/matters/service";
import { canReadMatter } from "@/lib/matters/acl";
import { getDb } from "@/lib/db";
import { entities } from "@/lib/db/schema";
import { PrintControls } from "./PrintControls";

export default async function RoutingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const matter = getMatterById(id);
  if (!matter || !canReadMatter(user, matter)) notFound();
  const entity = getDb().select().from(entities).where(eq(entities.id, matter.entityId)).get();

  const reviewerRows = [
    { role: "Prepared by", name: matter.proponentName },
    { role: "Reviewed by", name: "" },
    { role: "Reviewed by", name: "" },
    { role: "Approved by", name: "" },
    { role: "Approved by", name: "" },
  ];

  return (
    <div className="print-routing min-h-screen bg-white text-black p-4 md:p-8 max-w-[800px] mx-auto">
      <PrintControls />
      <header className="text-center border-b-2 border-black pb-4 mb-6">
        <p className="text-xs uppercase tracking-wide">Gardenia Legal — LEG-FORM-5 (Pilot)</p>
        <h1 className="text-xl font-bold mt-1">ROUTING / REVIEW SLIP</h1>
      </header>
      <table className="w-full text-sm mb-6 border-collapse">
        <tbody>
          <Field label="Company" value={entity?.name ?? "GBPI"} />
          <Field label="Matter No." value={matter.matterNumber} mono />
          <Field label="Contract type" value={matter.contractType} />
          <Field label="Subject / title" value={matter.title} />
          <Field label="Counterparty" value={matter.counterparty} />
          <Field label="Proponent" value={matter.proponentName} />
        </tbody>
      </table>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left">Action</th>
            <th className="border border-black p-2 text-left">Name</th>
            <th className="border border-black p-2 text-left">Signature</th>
            <th className="border border-black p-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {reviewerRows.map((row, i) => (
            <tr key={i}>
              <td className="border border-black p-3">{row.role}</td>
              <td className="border border-black p-3">{row.name}</td>
              <td className="border border-black p-3">________________________</td>
              <td className="border border-black p-3">____________</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="w-full text-sm border-collapse mt-4">
        <thead>
          <tr>
            <th className="border border-black p-2 text-left bg-gray-100">Remarks</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-4 h-24 align-top">{matter.internalNotes ?? ""}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs mt-6 text-gray-600">
        Generated {new Date().toISOString().slice(0, 10)} · Wet-ink signatures required · leg-form-5-v1
      </p>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr>
      <td className="border border-black p-2 font-semibold w-1/3">{label}</td>
      <td className={`border border-black p-2 ${mono ? "font-mono" : ""}`}>{value}</td>
    </tr>
  );
}