import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage, type StatusHistoryEntry } from '../api';
import { useAuth } from '../auth';
import { ErrorBox } from '../components';
import { formatDate } from '../format';
import { useLedger } from '../ledger';

/** Who may view payable status history (admins always; staff need the permission). */
export function canViewStatusHistory(auth: {
  isAdmin: boolean;
  can: (key: 'payables_status_history') => boolean;
}, kind: 'payable' | 'receivable') {
  if (auth.isAdmin) return true;
  if (kind !== 'payable') return true;
  return auth.can('payables_status_history');
}

export function StatusHistoryPanel({
  documentId,
  defaultOpen = false,
}: {
  documentId: number;
  defaultOpen?: boolean;
}) {
  const ledger = useLedger();
  const auth = useAuth();
  const allowed = canViewStatusHistory(auth, ledger.kind);
  const [open, setOpen] = useState(defaultOpen);

  const history = useQuery({
    queryKey: ['ledger', ledger.kind, 'status-history', documentId],
    queryFn: () => api.get<StatusHistoryEntry[]>(`${ledger.apiBase}/${documentId}/status-history`),
    enabled: allowed && open,
  });

  if (!allowed) return null;

  return (
    <div className="status-history">
      <button
        type="button"
        className="status-history-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? 'Hide status history' : 'Show status history'}
      </button>
      {open && (
        <>
          {history.isLoading && <p className="muted">Loading history...</p>}
          {history.error && <ErrorBox error={errorMessage(history.error)} />}
          {history.data?.length === 0 && <p className="muted">No status changes recorded yet.</p>}
          <ul className="status-history-list">
            {history.data?.map((h) => (
              <li key={h.id}>
                <div>
                  {h.from_status_name ? (
                    <>
                      <span style={{ color: h.from_status_color ?? undefined }}>{h.from_status_name}</span>
                      <span className="muted"> → </span>
                    </>
                  ) : null}
                  <strong style={{ color: h.to_status_color }}>{h.to_status_name}</strong>
                </div>
                <div className="muted small">
                  {h.changed_by_name || 'Unknown user'} · {new Date(h.created_at).toLocaleString()}
                </div>
                {h.remarks && <div className="small">Remarks: {h.remarks}</div>}
                {h.payment_reference && <div className="small">Reference: {h.payment_reference}</div>}
                {h.check_date && <div className="small">Check date: {formatDate(h.check_date)}</div>}
                {h.paid_at && <div className="small">Paid at: {formatDate(h.paid_at)}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
