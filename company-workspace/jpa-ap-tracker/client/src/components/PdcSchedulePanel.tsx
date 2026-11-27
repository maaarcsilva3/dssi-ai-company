import { formatAmountPlain, formatMoney } from '../format';
import { newPdcLine, sumPdcAmounts, type PdcLineDraft } from '../lib/pdc';

export function PdcSchedulePanel({
  lines,
  onChange,
  netAmount,
  readOnly,
  describedById = 'pdc-schedule-total',
}: {
  lines: PdcLineDraft[];
  onChange: (lines: PdcLineDraft[]) => void;
  netAmount: number;
  readOnly?: boolean;
  describedById?: string;
}) {
  const scheduled = sumPdcAmounts(lines);
  const match = Math.abs(scheduled - netAmount) <= 0.01;

  const setLine = (key: string, patch: Partial<PdcLineDraft>) => {
    onChange(lines.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  return (
    <div className="form-section span-all">
      <h2 className="form-section-title">PDC schedule</h2>
      {!lines.length && !readOnly && (
        <p className="muted small">Add post-dated check lines that sum to the payable net amount.</p>
      )}
      <div className="invoice-rows flex flex-col gap-2">
        {lines.map((line, index) => (
          <div key={line.key} className="invoice-row entry-sheet-grid">
            <span className="invoice-row-title">PDC {index + 1}</span>
            <label className="field">
              <span className="field-label">PDC no.</span>
              <input
                value={line.pdc_no}
                disabled={readOnly}
                onChange={(e) => setLine(line.key, { pdc_no: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">PDC date</span>
              <input
                type="date"
                value={line.pdc_date}
                disabled={readOnly}
                onChange={(e) => setLine(line.key, { pdc_date: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">Amount (PHP)</span>
              <input
                inputMode="decimal"
                value={line.amount}
                disabled={readOnly}
                aria-describedby={describedById}
                onChange={(e) => setLine(line.key, { amount: e.target.value })}
                onBlur={(e) => {
                  const preview = formatAmountPlain(e.target.value);
                  if (preview && e.target.value.trim()) {
                    setLine(line.key, { amount: preview.replace(/,/g, '') });
                  }
                }}
              />
            </label>
            {!readOnly && (
              <button
                type="button"
                className="btn ghost small"
                onClick={() => onChange(lines.filter((r) => r.key !== line.key))}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <button type="button" className="btn ghost small" onClick={() => onChange([...lines, newPdcLine()])}>
          + Add PDC
        </button>
      )}
      <p
        id={describedById}
        className={match ? 'muted small' : 'tag-overdue small'}
        style={{ marginTop: '0.5rem' }}
      >
        Scheduled total: {formatMoney(scheduled)} · Payable net: {formatMoney(netAmount)}
        {!match && netAmount > 0 ? ' — amounts must match' : match && netAmount > 0 ? ' — balanced' : ''}
      </p>
    </div>
  );
}