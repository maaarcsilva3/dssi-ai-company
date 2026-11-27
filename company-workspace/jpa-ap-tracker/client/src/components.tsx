import { useEffect, type ReactNode } from 'react';
import type { PayableStatus } from './api';

/** Status dropdown; inactive statuses are only listed when currently selected.
 *  When `allowedIds` is set, the open list shows only those targets (current stays
 *  selected via a hidden option so the control still displays the current name). */
export function StatusSelect({
  statuses,
  value,
  onChange,
  disabled,
  placeholder,
  allowedIds,
}: {
  statuses: PayableStatus[] | undefined;
  value: number | '';
  onChange: (status: PayableStatus) => void;
  disabled?: boolean;
  placeholder?: string;
  /** If provided, only these status IDs appear as change targets. */
  allowedIds?: number[] | null;
}) {
  const current = statuses?.find((s) => s.id === value);
  const color = current?.color ?? '#6b7280';
  const allowed =
    allowedIds == null ? null : new Set(allowedIds.map((id) => Number(id)));
  const options =
    statuses?.filter((s) => {
      if (!(s.active || s.id === value)) return false;
      if (allowed == null) return true;
      return allowed.has(s.id);
    }) ?? [];
  const currentInOptions = value !== '' && options.some((s) => s.id === value);
  return (
    <select
      className="status-select"
      style={current ? { color, background: `${color}1a`, borderColor: `${color}66` } : undefined}
      value={value}
      disabled={disabled || (allowed != null && options.length === 0 && !placeholder)}
      onChange={(e) => {
        const next = statuses?.find((s) => s.id === Number(e.target.value));
        if (next && next.id !== value) onChange(next);
      }}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {allowed != null && current && value !== '' && !currentInOptions && (
        <option value={value} hidden>
          {current.name}
        </option>
      )}
      {options.map((s) => (
        <option key={s.id} value={s.id} style={{ color: '#1f2933', background: '#fff' }}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <strong>{title}</strong>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

/** Destructive / irreversible action confirmation (replaces window.confirm). */
export function ConfirmDialog({
  request,
  pending,
  onClose,
}: {
  request: ConfirmRequest | null;
  pending?: boolean;
  onClose: () => void;
}) {
  if (!request) return null;
  const busy = Boolean(pending);
  return (
    <Modal title={request.title} onClose={busy ? () => undefined : onClose}>
      <p style={{ marginTop: 0 }}>{request.message}</p>
      <div className="form-actions">
        <button
          type="button"
          className="btn danger"
          disabled={busy}
          onClick={() => request.onConfirm()}
        >
          {busy ? 'Working…' : request.confirmLabel ?? 'Delete'}
        </button>
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

export function ErrorBox({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <div className="alert error">{error}</div>;
}
