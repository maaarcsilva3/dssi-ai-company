import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { api, errorMessage, qs } from '../api';
import { ErrorBox, Modal } from '../components';
import { formatMoney } from '../format';
import { useAuth } from '../auth';

interface Allowance {
  id: number;
  truck_id: string;
  allowance_date: string;
  period_month: string;
  amount: string;
  payee_name: string | null;
  remarks: string | null;
}

interface Report {
  dateFrom: string | null;
  dateTo: string | null;
  byParticular: { truck_id: string; entry_count: number; total_amount: string }[];
  items: Allowance[];
  entryCount: number;
  grandTotal: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function PettyCashPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [dateFrom, setDateFrom] = useState(monthStartIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    truck_id: '',
    allowance_date: todayIso(),
    amount: '',
    payee_name: '',
    remarks: '',
  });

  const filterKey = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);

  const report = useQuery({
    queryKey: ['truck-allowance-report', filterKey],
    queryFn: () =>
      api.get<Report>(
        `/truck-allowances/report${qs({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        })}`,
      ),
    enabled: Boolean(dateFrom || dateTo),
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/truck-allowances', {
        truck_id: form.truck_id,
        allowance_date: form.allowance_date,
        amount: form.amount,
        payee_name: form.payee_name || null,
        remarks: form.remarks || null,
      }),
    onSuccess: async () => {
      setForm((f) => ({ ...f, truck_id: '', amount: '', payee_name: '', remarks: '' }));
      setFormOpen(false);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['truck-allowance-report'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onExport = () => {
    const data = report.data;
    if (!data) return;
    const rangeLabel = [dateFrom || '…', dateTo || '…'].join('_to_');
    const rows = [
      ['Date from', dateFrom || ''],
      ['Date to', dateTo || ''],
      ['Entries', data.entryCount],
      ['Grand total', Number(data.grandTotal)],
      [],
      ['Date', 'Name', 'Particular', 'Remarks', 'Amount'],
      ...data.items.map((i) => [
        i.allowance_date,
        i.payee_name ?? '',
        i.truck_id,
        i.remarks ?? '',
        Number(i.amount),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Petty cash');
    XLSX.writeFile(wb, `petty-cash-${rangeLabel}.xlsx`);
  };

  return (
    <section>
      <div className="page-header">
        <div className="min-w-0">
          <h1>Petty cash</h1>
          <p className="muted">Entries with date-range filter and totals for the selected period.</p>
        </div>
        <div className="page-header-actions">
          {auth.can('petty_cash_manage') && (
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setError(null);
                setFormOpen(true);
              }}
            >
              + Add entry
            </button>
          )}
          <button type="button" className="btn" onClick={onExport} disabled={!report.data}>
            Export Excel
          </button>
        </div>
      </div>

      <div className="card filters">
        <label className="filter-date">
          Date from
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="filter-date">
          Date to
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
      </div>

      <ErrorBox error={!formOpen ? error ?? (report.isError ? errorMessage(report.error) : null) : null} />

      {formOpen && auth.can('petty_cash_manage') && (
        <Modal
          title="Add entry"
          onClose={create.isPending ? () => undefined : () => setFormOpen(false)}
        >
          <form
            className="entry-sheet entry-sheet-modal"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <p className="muted">Required fields are marked with *.</p>
            <div className="entry-sheet-grid">
              <label className="field">
                <span className="field-label">
                  Date <span className="req">*</span>
                </span>
                <input
                  type="date"
                  value={form.allowance_date}
                  onChange={(e) => setForm({ ...form, allowance_date: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Name</span>
                <input
                  value={form.payee_name}
                  onChange={(e) => setForm({ ...form, payee_name: e.target.value })}
                  placeholder="Payee name"
                />
              </label>
              <label className="field">
                <span className="field-label">
                  Particular <span className="req">*</span>
                </span>
                <input
                  value={form.truck_id}
                  onChange={(e) => setForm({ ...form, truck_id: e.target.value })}
                  required
                  placeholder="e.g. TRK-01 / fuel / meal"
                />
              </label>
              <label className="field">
                <span className="field-label">
                  Amount <span className="req">*</span>
                </span>
                <input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </label>
              <label className="field span-2">
                <span className="field-label">Remarks</span>
                <input
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Optional notes"
                />
              </label>
            </div>
            <ErrorBox error={error} />
            <div className="entry-sheet-actions">
              <button type="submit" className="btn primary" disabled={create.isPending}>
                {create.isPending ? 'Saving…' : 'Add entry'}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setFormOpen(false)}
                disabled={create.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="card">
        <h2 className="form-section-title">Summary</h2>
        <div className="summary">
          <span>
            Entries: <strong>{report.data?.entryCount ?? 0}</strong>
          </span>
          <span>
            Total: <strong>{formatMoney(report.data?.grandTotal ?? 0)}</strong>
          </span>
        </div>
        {(report.data?.byParticular?.length ?? 0) > 0 && (
          <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Particular</th>
                  <th className="num">Entries</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {(report.data?.byParticular ?? []).map((r) => (
                  <tr key={r.truck_id}>
                    <td>{r.truck_id}</td>
                    <td className="num">{r.entry_count}</td>
                    <td className="num">{formatMoney(r.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {report.isLoading && <p className="muted">Loading…</p>}
      </div>

      <div className="card">
        <h2 className="form-section-title">Entries</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Particular</th>
                <th>Remarks</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(report.data?.items ?? []).map((i) => (
                <tr key={i.id}>
                  <td>{i.allowance_date}</td>
                  <td>{i.payee_name ?? '—'}</td>
                  <td>{i.truck_id}</td>
                  <td>{i.remarks ?? '—'}</td>
                  <td className="num">{formatMoney(i.amount)}</td>
                </tr>
              ))}
              {!report.isLoading && (report.data?.items.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No entries in this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
