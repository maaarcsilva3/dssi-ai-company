import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api';
import { ErrorBox, Modal } from '../components';
import { formatMoney } from '../format';
import { useAuth } from '../auth';

interface LiquidationRow {
  id: number;
  payee_name: string;
  advance_amount: string;
  advance_date: string;
  status: string;
  spent_amount: string;
  remaining_amount: string;
  assigned_to_name: string | null;
}

export default function LiquidationsPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    payee_name: '',
    advance_amount: '',
    advance_date: new Date().toISOString().slice(0, 10),
    remarks: '',
  });

  const list = useQuery({
    queryKey: ['liquidations'],
    queryFn: () => api.get<{ items: LiquidationRow[] }>('/liquidations'),
  });

  const closeForm = () => {
    setFormOpen(false);
    setForm((f) => ({ ...f, payee_name: '', advance_amount: '', remarks: '' }));
    setError(null);
  };

  const create = useMutation({
    mutationFn: () => api.post('/liquidations', form),
    onSuccess: async () => {
      closeForm();
      await qc.invalidateQueries({ queryKey: ['liquidations'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Liquidations</h1>
          <p className="muted">Cash advances and expense liquidation tracking.</p>
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
              + New advance
            </button>
          </div>
        )}
      </div>
      <ErrorBox error={!formOpen ? error ?? (list.isError ? errorMessage(list.error) : null) : null} />

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Payee</th>
                <th>Date</th>
                <th>Status</th>
                <th className="num">Advance</th>
                <th className="num">Spent</th>
                <th className="num">Remaining</th>
                <th>Assignee</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(list.data?.items ?? []).map((row) => (
                <tr key={row.id}>
                  <td>{row.payee_name}</td>
                  <td>{row.advance_date}</td>
                  <td>{row.status}</td>
                  <td className="num">{formatMoney(row.advance_amount)}</td>
                  <td className="num">{formatMoney(row.spent_amount)}</td>
                  <td className="num">{formatMoney(row.remaining_amount)}</td>
                  <td>{row.assigned_to_name ?? '—'}</td>
                  <td>
                    <Link to={`/liquidations/${row.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
              {!list.isLoading && (list.data?.items.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    No advances yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && auth.can('liquidations_manage') && (
        <Modal title="New advance" onClose={create.isPending ? () => undefined : closeForm}>
          <form className="entry-sheet entry-sheet-modal" onSubmit={onSubmit}>
            <p className="muted">
              Record a cash advance. Expenses can be liquidated after opening the advance.
            </p>
            <div className="entry-sheet-grid">
              <label className="field">
                <span className="field-label">
                  Payee <span className="req">*</span>
                </span>
                <input
                  value={form.payee_name}
                  onChange={(e) => setForm({ ...form, payee_name: e.target.value })}
                  required
                  placeholder="Who received the advance"
                />
              </label>
              <label className="field">
                <span className="field-label">
                  Advance amount <span className="req">*</span>
                </span>
                <input
                  inputMode="decimal"
                  value={form.advance_amount}
                  onChange={(e) => setForm({ ...form, advance_amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </label>
              <label className="field">
                <span className="field-label">
                  Advance date <span className="req">*</span>
                </span>
                <input
                  type="date"
                  value={form.advance_date}
                  onChange={(e) => setForm({ ...form, advance_date: e.target.value })}
                  required
                />
              </label>
              <label className="field span-all">
                <span className="field-label">Remarks</span>
                <textarea
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Optional notes"
                />
              </label>
            </div>
            <ErrorBox error={error} />
            <div className="entry-sheet-actions">
              <button type="submit" className="btn primary" disabled={create.isPending}>
                {create.isPending ? 'Saving…' : 'Create advance'}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={closeForm}
                disabled={create.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
