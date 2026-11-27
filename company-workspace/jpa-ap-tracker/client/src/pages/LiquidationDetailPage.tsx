import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api';
import { ConfirmDialog, ErrorBox, Modal, type ConfirmRequest } from '../components';
import { formatAmountOnBlur, formatMoney } from '../format';
import { useAuth } from '../auth';

interface Line {
  id: number;
  line_date: string;
  description: string;
  amount: string;
}

interface Detail {
  id: number;
  payee_name: string;
  advance_amount: string;
  advance_date: string;
  status: string;
  spent_amount: string;
  remaining_amount: string;
  remarks: string | null;
  lines: Line[];
}

export default function LiquidationDetailPage() {
  const { id } = useParams();
  const auth = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [line, setLine] = useState({
    line_date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
  });

  const detail = useQuery({
    queryKey: ['liquidation', id],
    queryFn: () => api.get<Detail>(`/liquidations/${id}`),
    enabled: Boolean(id),
  });

  const closeForm = () => {
    setFormOpen(false);
    setLine((l) => ({ ...l, description: '', amount: '' }));
    setError(null);
  };

  const addLine = useMutation({
    mutationFn: () => api.post(`/liquidations/${id}/lines`, line),
    onSuccess: async () => {
      closeForm();
      await qc.invalidateQueries({ queryKey: ['liquidation', id] });
      await qc.invalidateQueries({ queryKey: ['liquidations'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const removeLine = useMutation({
    mutationFn: (lineId: number) => api.del(`/liquidations/${id}/lines/${lineId}`),
    onSuccess: async () => {
      setConfirm(null);
      await qc.invalidateQueries({ queryKey: ['liquidation', id] });
      await qc.invalidateQueries({ queryKey: ['liquidations'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    addLine.mutate();
  };

  const row = detail.data;

  return (
    <section>
      <p>
        <Link to="/liquidations">← Liquidations</Link>
      </p>
      <ErrorBox error={!formOpen ? error ?? (detail.isError ? errorMessage(detail.error) : null) : null} />
      <ConfirmDialog
        request={confirm}
        pending={removeLine.isPending}
        onClose={() => setConfirm(null)}
      />
      {row && (
        <>
          <div className="page-header">
            <div>
              <h1>{row.payee_name}</h1>
              <p className="muted">
                Advance {formatMoney(row.advance_amount)} on {row.advance_date} · Status {row.status}
              </p>
            </div>
            {auth.can('liquidations_manage') && (
              <div className="page-header-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setError(null);
                    setFormOpen(true);
                  }}
                >
                  + Add expense
                </button>
              </div>
            )}
          </div>
          <div className="card">
            <p>
              Spent {formatMoney(row.spent_amount)} · Remaining {formatMoney(row.remaining_amount)}
            </p>
            {row.remarks && <p className="muted">{row.remarks}</p>}
          </div>

          <div className="card">
            <h2 className="form-section-title">Expense lines</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th className="num">Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {row.lines.map((l) => (
                    <tr key={l.id}>
                      <td>{l.line_date}</td>
                      <td>{l.description}</td>
                      <td className="num">{formatMoney(l.amount)}</td>
                      <td>
                        {auth.can('liquidations_manage') && (
                          <button
                            type="button"
                            className="btn ghost small"
                            onClick={() =>
                              setConfirm({
                                title: 'Remove expense',
                                message: `Remove “${l.description}” (${formatMoney(l.amount)}) on ${l.line_date}?`,
                                confirmLabel: 'Remove',
                                onConfirm: () => removeLine.mutate(l.id),
                              })
                            }
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {formOpen && auth.can('liquidations_manage') && (
            <Modal title="Add expense" onClose={addLine.isPending ? () => undefined : closeForm}>
              <form className="form-grid paper-form" onSubmit={onSubmit}>
                <label className="field">
                  <span className="field-label">Date</span>
                  <input
                    type="date"
                    value={line.line_date}
                    onChange={(e) => setLine({ ...line, line_date: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Amount</span>
                  <input
                    inputMode="decimal"
                    value={line.amount}
                    onChange={(e) => setLine({ ...line, amount: e.target.value })}
                    onBlur={(e) => {
                      const next = formatAmountOnBlur(e.target.value);
                      if (next !== line.amount) setLine({ ...line, amount: next });
                    }}
                    required
                  />
                </label>
                <label className="field span-all">
                  <span className="field-label">Description</span>
                  <input
                    value={line.description}
                    onChange={(e) => setLine({ ...line, description: e.target.value })}
                    required
                  />
                </label>
                <ErrorBox error={error} />
                <div className="span-all form-actions">
                  <button type="submit" className="btn primary" disabled={addLine.isPending}>
                    Add line
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={closeForm}
                    disabled={addLine.isPending}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Modal>
          )}
        </>
      )}
    </section>
  );
}
