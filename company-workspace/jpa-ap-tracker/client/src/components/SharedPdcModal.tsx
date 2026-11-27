import { useState } from 'react';
import { Modal } from '../components';
import { formatDate, formatMoney } from '../format';
import type { SharedPdcDraft, SharedPdcDrafts } from '../lib/pdc';

/** An invoice row's view of the shared PDC that pays it. Without handlers it is read-only. */
export function SharedPdcSummary({
  check,
  amount,
  invoiceLabels,
  onEdit,
  onLeave,
}: {
  check: SharedPdcDraft | undefined;
  amount: number;
  invoiceLabels: string[];
  onEdit?: () => void;
  onLeave?: () => void;
}) {
  return (
    <div className="invoice-pdc">
      <div className="field-label">Shared PDC</div>
      <p className="small">
        {check?.pdc_no || 'No check no. yet'} · {check?.pdc_date ? formatDate(check.pdc_date) : 'no date'} ·{' '}
        <strong>{formatMoney(amount)}</strong>
      </p>
      <p className="muted small">One check for {invoiceLabels.join(', ')}</p>
      {(onEdit || onLeave) && (
        <div className="flex flex-wrap gap-2">
          {onEdit && (
            <button type="button" className="btn small" onClick={onEdit}>
              Edit shared PDC…
            </button>
          )}
          {onLeave && (
            <button type="button" className="btn ghost small" onClick={onLeave}>
              Use own PDC schedule
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export interface SharedPdcCandidate {
  key: string;
  label: string;
  net: number;
  pdc_group: string | null;
  ownLineCount: number;
}

/** Picks the invoices one post-dated check pays in full, plus its check no. and date. */
export function SharedPdcModal({
  group,
  invoices,
  sharedPdcs,
  originKey,
  onApply,
  onEnd,
  onClose,
}: {
  group: string;
  invoices: SharedPdcCandidate[];
  sharedPdcs: SharedPdcDrafts;
  /** Invoice row the modal was opened from; pre-selected for a new shared PDC. */
  originKey: string;
  onApply: (check: SharedPdcDraft, members: Set<string>) => void;
  onEnd: () => void;
  onClose: () => void;
}) {
  const isNew = !invoices.some((inv) => inv.pdc_group === group);
  const [check, setCheck] = useState<SharedPdcDraft>(sharedPdcs[group] ?? { pdc_no: '', pdc_date: '' });
  const [members, setMembers] = useState(
    () => new Set(isNew ? [originKey] : invoices.filter((inv) => inv.pdc_group === group).map((inv) => inv.key)),
  );
  const amount = invoices.reduce((sum, inv) => sum + (members.has(inv.key) ? inv.net : 0), 0);
  const toggle = (key: string) =>
    setMembers((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const note = (inv: SharedPdcCandidate) => {
    if (inv.pdc_group && inv.pdc_group !== group) {
      const other = sharedPdcs[inv.pdc_group]?.pdc_no;
      return `moves here from shared PDC${other ? ` ${other}` : ''}`;
    }
    if (inv.pdc_group !== group && inv.ownLineCount > 0) {
      return `its own schedule (${inv.ownLineCount} PDC${inv.ownLineCount === 1 ? '' : 's'}) is set aside`;
    }
    return null;
  };

  return (
    <Modal title={isNew ? 'Share one PDC across invoices' : 'Edit shared PDC'} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="muted small">One check pays every selected invoice in full. Its amount is the sum of their nets.</p>
        <div className="entry-sheet-grid">
          <label className="field">
            <span className="field-label">PDC no.</span>
            <input value={check.pdc_no} onChange={(e) => setCheck({ ...check, pdc_no: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">PDC date</span>
            <input type="date" value={check.pdc_date} onChange={(e) => setCheck({ ...check, pdc_date: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Amount (PHP)</span>
            <input readOnly value={formatMoney(amount)} aria-describedby="shared-pdc-amount-hint" />
            <span id="shared-pdc-amount-hint" className="hint">
              Sum of the selected invoices&apos; nets
            </span>
          </label>
        </div>
        <fieldset className="flex flex-col gap-1" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="field-label">Invoices on this check</legend>
          {invoices.map((inv) => {
            const why = note(inv);
            return (
              <label key={inv.key} className="checkbox">
                <input type="checkbox" checked={members.has(inv.key)} onChange={() => toggle(inv.key)} />
                <span>
                  {inv.label} · net {formatMoney(inv.net)}
                  {why && members.has(inv.key) && <span className="muted small"> ({why})</span>}
                </span>
              </label>
            );
          })}
        </fieldset>
        {members.size < 2 && <p className="tag-overdue small">Select at least two invoices to share one PDC.</p>}
        <div className="form-actions">
          <button
            type="button"
            className="btn primary"
            disabled={members.size < 2}
            onClick={() => onApply(check, members)}
          >
            {isNew ? 'Share PDC' : 'Apply'}
          </button>
          {!isNew && (
            <button type="button" className="btn ghost danger" onClick={onEnd}>
              End shared PDC
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
