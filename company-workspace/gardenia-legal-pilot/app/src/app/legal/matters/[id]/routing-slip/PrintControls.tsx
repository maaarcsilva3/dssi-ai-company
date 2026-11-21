"use client";

export function PrintControls() {
  return (
    <div className="no-print mb-6 flex gap-2">
      <button type="button" className="btn-primary text-sm" onClick={() => window.print()}>
        Print routing slip
      </button>
      <button type="button" className="btn-outline text-sm" onClick={() => window.close()}>
        Close
      </button>
    </div>
  );
}