import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ar2307FileUrl, errorMessage, qs } from '../api';
import { ConfirmDialog, ErrorBox, Modal, type ConfirmRequest } from '../components';
import { formatAmountOnBlur, formatAmountPlain, formatDateMdY, formatMoney } from '../format';
import { downloadArMonthlySummaryYearPivot, type YearPivotExport } from '../lib/arExport';
import { useAuth } from '../auth';

export type ReceivablesMode = 'details' | 'summary';

interface ArClient {
  id: number;
  name: string;
  active: boolean;
}

interface DetailRow {
  id: number;
  summary_id: number;
  invoice_no: string;
  /** Shipment / trip date. */
  entry_date: string;
  billing_date: string | null;
  receiving_date: string | null;
  reference: string | null;
  origin: string | null;
  destination: string | null;
  amount: string;
  client_name: string;
  aging_days: number | null;
  summary_due_date: string | null;
}

interface SummaryRow {
  id: number;
  invoice_no: string;
  client_id: number;
  client_name: string;
  billing_reference: string | null;
  trip_type: string | null;
  trip_classification: string | null;
  fleet_type: string | null;
  service_type: string | null;
  coverage_start: string | null;
  coverage_end: string | null;
  invoice_date: string | null;
  due_date: string | null;
  payment_status: 'unpaid' | 'paid';
  acknowledgment_receipt_no: string | null;
  aging_days: number | null;
  aging_start_date: string | null;
  days_past_due: number | null;
  total_sales_vatex: string;
  vat_amount: string;
  total_sales_vatinc: string;
  ewt_amount: string;
  total_after_ewt: string;
  deductions_total: string;
  grand_total: string;
  ewt_2307_status: 'pending' | 'submitted';
  ewt_2307_submitted_at: string | null;
  ewt_2307_original_name: string | null;
  detail_count: number;
}

interface SummaryDetail {
  id: number;
  deductions: { id: number; description: string; amount: string }[];
  trip_classification: string | null;
  ewt_2307_status: 'pending' | 'submitted';
  ewt_2307_submitted_at: string | null;
  ewt_2307_original_name: string | null;
}

function monthInput(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReceivablesBillingPage({ mode }: { mode: ReceivablesMode }) {
  const auth = useAuth();
  const qc = useQueryClient();
  const canEdit = auth.isAdmin || auth.can('ar_edit');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [month, setMonth] = useState(monthInput());
  const [exporting, setExporting] = useState(false);
  const [ewtStatus, setEwtStatus] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [paymentModalId, setPaymentModalId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [deduction, setDeduction] = useState({ description: '', amount: '' });
  const [submit2307Date, setSubmit2307Date] = useState(new Date().toISOString().slice(0, 10));
  const [file2307, setFile2307] = useState<File | null>(null);
  const [paymentDraft, setPaymentDraft] = useState({
    payment_status: 'unpaid' as 'unpaid' | 'paid',
    due_date: '',
    acknowledgment_receipt_no: '',
  });

  useEffect(() => {
    setFile2307(null);
  }, [expandedId]);

  const emptyDetail = {
    invoice_no: '',
    entry_date: new Date().toISOString().slice(0, 10),
    billing_date: '',
    receiving_date: '',
    reference: '',
    origin: '',
    destination: '',
    amount: '',
  };
  const [detailForm, setDetailForm] = useState(emptyDetail);
  const [editDetailId, setEditDetailId] = useState<number | null>(null);
  const [showDetailForm, setShowDetailForm] = useState(false);
  const detailFormRef = useRef<HTMLFormElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const clients = useQuery({
    queryKey: ['ar-clients'],
    queryFn: () => api.get<{ items: ArClient[] }>('/ar/clients'),
  });

  const deductionDescriptions = useQuery({
    queryKey: ['ar-deduction-descriptions'],
    queryFn: () =>
      api.get<{ id: number; name: string; active: boolean }[]>('/ar-deduction-descriptions'),
    enabled: mode === 'summary',
  });

  const details = useQuery({
    queryKey: ['ar-details', clientId, invoiceSearch, dueFrom, dueTo],
    queryFn: () =>
      api.get<{ items: DetailRow[] }>(
        `/ar/details${qs({
          clientId: clientId || undefined,
          search: invoiceSearch.trim() || undefined,
          dueFrom: dueFrom || undefined,
          dueTo: dueTo || undefined,
        })}`,
      ),
    enabled: mode === 'details',
  });

  const summaries = useQuery({
    queryKey: ['ar-summaries', clientId, month, ewtStatus, paymentStatusFilter, invoiceSearch, dueFrom, dueTo],
    queryFn: () =>
      api.get<{ items: SummaryRow[] }>(
        `/ar/summaries${qs({
          clientId: clientId || undefined,
          month: month ? `${month}-01` : undefined,
          ewtStatus: ewtStatus || undefined,
          paymentStatus: paymentStatusFilter || undefined,
          search: invoiceSearch.trim() || undefined,
          dueFrom: dueFrom || undefined,
          dueTo: dueTo || undefined,
        })}`,
      ),
    enabled: mode === 'summary',
  });

  const filteredSummaryRows = summaries.data?.items ?? [];
  const filteredDetailRows = details.data?.items ?? [];
  const listTotals = useMemo(() => {
    if (mode === 'summary') {
      const total = filteredSummaryRows.reduce((acc, row) => acc + Number(row.grand_total), 0);
      return { count: filteredSummaryRows.length, total };
    }
    const total = filteredDetailRows.reduce((acc, row) => acc + Number(row.amount), 0);
    return { count: filteredDetailRows.length, total };
  }, [mode, filteredSummaryRows, filteredDetailRows]);

  const summaryDetail = useQuery({
    queryKey: ['ar-summary', expandedId],
    queryFn: () => api.get<SummaryDetail>(`/ar/summaries/${expandedId}`),
    enabled: expandedId != null,
  });

  useEffect(() => {
    const focusId = paymentModalId ?? expandedId;
    if (focusId == null) return;
    const row = summaries.data?.items.find((s) => s.id === focusId);
    if (!row) return;
    setPaymentDraft({
      payment_status: row.payment_status ?? 'unpaid',
      due_date: row.due_date ?? '',
      acknowledgment_receipt_no: row.acknowledgment_receipt_no ?? '',
    });
  }, [expandedId, paymentModalId, summaries.data]);

  const importFile = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post<{ warning: string | null; summary: { invoice_no: string }; detailCount: number }>(
        '/ar/import',
        fd,
      );
    },
    onSuccess: async (data) => {
      setError(null);
      setNotice(
        `Imported invoice ${data.summary.invoice_no} (${data.detailCount} lines)${
          data.warning ? ` — ${data.warning}` : ''
        }`,
      );
      await qc.invalidateQueries({ queryKey: ['ar-details'] });
      await qc.invalidateQueries({ queryKey: ['ar-summaries'] });
      await qc.invalidateQueries({ queryKey: ['ar-clients'] });
    },
    onError: (e) => {
      setNotice(null);
      setError(errorMessage(e));
    },
  });

  const saveDetail = useMutation({
    mutationFn: () => {
      const body = {
        invoice_no: detailForm.invoice_no,
        entry_date: detailForm.entry_date,
        billing_date: detailForm.billing_date || null,
        receiving_date: detailForm.receiving_date || null,
        reference: detailForm.reference.trim() || 'N/A',
        origin: detailForm.origin.trim() || 'N/A',
        destination: detailForm.destination.trim() || 'N/A',
        amount: detailForm.amount,
      };
      return editDetailId
        ? api.put(`/ar/details/${editDetailId}`, body)
        : api.post('/ar/details', body);
    },
    onSuccess: async () => {
      setDetailForm(emptyDetail);
      setEditDetailId(null);
      setShowDetailForm(false);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['ar-details'] });
      await qc.invalidateQueries({ queryKey: ['ar-summaries'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const removeDetail = useMutation({
    mutationFn: (id: number) => api.del(`/ar/details/${id}`),
    onSuccess: async () => {
      setConfirm(null);
      if (editDetailId) {
        setEditDetailId(null);
        setDetailForm(emptyDetail);
        setShowDetailForm(false);
      }
      await qc.invalidateQueries({ queryKey: ['ar-details'] });
      await qc.invalidateQueries({ queryKey: ['ar-summaries'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const addDeduction = useMutation({
    mutationFn: () => api.post(`/ar/summaries/${expandedId}/deductions`, deduction),
    onSuccess: async () => {
      setDeduction({ description: '', amount: '' });
      await qc.invalidateQueries({ queryKey: ['ar-summary', expandedId] });
      await qc.invalidateQueries({ queryKey: ['ar-summaries'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const removeDeduction = useMutation({
    mutationFn: (deductionId: number) => api.del(`/ar/summaries/${expandedId}/deductions/${deductionId}`),
    onSuccess: async () => {
      setConfirm(null);
      await qc.invalidateQueries({ queryKey: ['ar-summary', expandedId] });
      await qc.invalidateQueries({ queryKey: ['ar-summaries'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const patchClass = useMutation({
    mutationFn: (trip_classification: string) =>
      api.patch(`/ar/summaries/${expandedId}`, { trip_classification }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['ar-summary', expandedId] });
      await qc.invalidateQueries({ queryKey: ['ar-summaries'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const patchPayment = useMutation({
    mutationFn: (summaryId: number) =>
      api.patch(`/ar/summaries/${summaryId}`, {
        payment_status: paymentDraft.payment_status,
        due_date: paymentDraft.due_date || null,
        acknowledgment_receipt_no:
          paymentDraft.payment_status === 'paid'
            ? paymentDraft.acknowledgment_receipt_no.trim()
            : paymentDraft.acknowledgment_receipt_no.trim() || null,
      }),
    onSuccess: async (_data, summaryId) => {
      setError(null);
      setPaymentModalId(null);
      await qc.invalidateQueries({ queryKey: ['ar-summary', summaryId] });
      await qc.invalidateQueries({ queryKey: ['ar-summaries'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const patch2307 = useMutation({
    mutationFn: async (input: {
      ewt_2307_status: 'pending' | 'submitted';
      ewt_2307_submitted_at?: string | null;
      file?: File | null;
    }) => {
      if (input.ewt_2307_status === 'submitted') {
        if (!input.file) throw new Error('Attach a BIR 2307 file to submit.');
        const fd = new FormData();
        fd.append('ewt_2307_status', 'submitted');
        fd.append('ewt_2307_submitted_at', input.ewt_2307_submitted_at ?? '');
        fd.append('file', input.file);
        return api.post(`/ar/summaries/${expandedId}/2307`, fd);
      }
      return api.patch(`/ar/summaries/${expandedId}/2307`, {
        ewt_2307_status: 'pending',
        ewt_2307_submitted_at: null,
      });
    },
    onSuccess: async () => {
      setFile2307(null);
      await qc.invalidateQueries({ queryKey: ['ar-summary', expandedId] });
      await qc.invalidateQueries({ queryKey: ['ar-summaries'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const activeClients = useMemo(
    () => (clients.data?.items ?? []).filter((c) => c.active),
    [clients.data],
  );

  return (
    <section>
      <div className="page-header">
        <div className="min-w-0">
          <h1>{mode === 'details' ? 'Billing lines' : 'Monthly summary'}</h1>
          <p className="muted">
            {mode === 'details'
              ? 'Logistics billing trip lines. Upload an SI Excel workbook to import.'
              : 'Monthly invoice summaries, deductions, and BIR 2307 submissions.'}
          </p>
        </div>
        <div className="page-header-actions">
          {mode === 'summary' && (
            <button
              type="button"
              className="btn"
              disabled={exporting || !month}
              onClick={async () => {
                setExporting(true);
                setError(null);
                try {
                  const year = month.slice(0, 4);
                  const pivot = await api.get<YearPivotExport>(
                    `/ar/summaries/year-pivot${qs({ year })}`,
                  );
                  downloadArMonthlySummaryYearPivot(pivot);
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? 'Exporting…' : 'Download monthly summary'}
            </button>
          )}
          {mode === 'details' && canEdit && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                hidden
                disabled={importFile.isPending}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setError(null);
                  setNotice(null);
                  importFile.mutate(f);
                }}
              />
              <button
                type="button"
                className="btn primary"
                disabled={importFile.isPending}
                onClick={() => importInputRef.current?.click()}
              >
                {importFile.isPending ? 'Uploading…' : 'Upload Excel'}
              </button>
            </>
          )}
        </div>
      </div>

      <ErrorBox error={error} />
      {notice && <p className="alert info">{notice}</p>}
      {mode === 'details' && canEdit && (
        <p className="muted small" style={{ marginTop: '-0.5rem' }}>
          Accepts SI workbooks with trip lines (REFERENCE / WAYBILL / SLPS / PLATE). Missing origin,
          destination, or reference become N/A.
        </p>
      )}

      <div className="card filters">
        <label className="field filter-party">
          <span className="field-label">Client</span>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setInvoiceSearch('');
            }}
          >
            <option value="">All</option>
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field filter-compact">
          <span className="field-label">Invoice no.</span>
          <input
            type="search"
            value={invoiceSearch}
            placeholder="Invoice no."
            onChange={(e) => setInvoiceSearch(e.target.value)}
            onBlur={(e) => setInvoiceSearch(e.target.value.trim())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setInvoiceSearch((e.target as HTMLInputElement).value.trim());
            }}
          />
        </label>
        <label className="field filter-date">
          <span className="field-label">Due from</span>
          <input type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} />
        </label>
        <label className="field filter-date">
          <span className="field-label">Due to</span>
          <input type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} />
        </label>
        {mode === 'summary' && (
          <>
            <label className="field filter-date">
              <span className="field-label">Month</span>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </label>
            <label className="field filter-compact">
              <span className="field-label">2307 status</span>
              <select value={ewtStatus} onChange={(e) => setEwtStatus(e.target.value)}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
              </select>
            </label>
            <label className="field filter-compact">
              <span className="field-label">Payment status</span>
              <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </label>
          </>
        )}
      </div>

      <div className="summary">
        {(mode === 'summary' ? summaries.isLoading : details.isLoading) ? (
          '—'
        ) : (
          <>
            {listTotals.count} invoice{listTotals.count === 1 ? '' : 's'} · Total:{' '}
            {formatMoney(listTotals.total)}
          </>
        )}
      </div>

      {mode === 'details' && (
        <>
          {canEdit && (
            <div className="page-header-actions" style={{ marginBottom: '0.75rem' }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setEditDetailId(null);
                  setDetailForm(emptyDetail);
                  setShowDetailForm(true);
                }}
              >
                + Add detail line
              </button>
            </div>
          )}
          {canEdit && showDetailForm && (
            <Modal
              title={editDetailId ? 'Edit detail line' : 'Add detail line'}
              onClose={
                saveDetail.isPending
                  ? () => undefined
                  : () => {
                      setEditDetailId(null);
                      setDetailForm(emptyDetail);
                      setShowDetailForm(false);
                    }
              }
            >
              <form
                ref={detailFormRef}
                className="entry-sheet entry-sheet-modal"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  saveDetail.mutate();
                }}
              >
                <p className="muted">
                  Enter the invoice, trip route, and amount. Required fields are marked with *.
                </p>
                <div className="entry-sheet-grid">
                  <label className="field">
                    <span className="field-label">
                      Invoice no. <span className="req">*</span>
                    </span>
                    <input
                      value={detailForm.invoice_no}
                      onChange={(e) => setDetailForm({ ...detailForm, invoice_no: e.target.value })}
                      required
                      disabled={editDetailId != null}
                      placeholder="e.g. SI-12345"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">
                      Shipment date <span className="req">*</span>
                    </span>
                    <input
                      type="date"
                      value={detailForm.entry_date}
                      onChange={(e) => setDetailForm({ ...detailForm, entry_date: e.target.value })}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Billing date</span>
                    <input
                      type="date"
                      value={detailForm.billing_date}
                      onChange={(e) => setDetailForm({ ...detailForm, billing_date: e.target.value })}
                    />
                    <span className="hint">Filled from the SI sheet date on Excel import</span>
                  </label>
                  <label className="field">
                    <span className="field-label">Receiving date</span>
                    <input
                      type="date"
                      value={detailForm.receiving_date}
                      onChange={(e) =>
                        setDetailForm({ ...detailForm, receiving_date: e.target.value })
                      }
                    />
                    <span className="hint">
                      When set, aging starts from this date instead of billing date
                    </span>
                  </label>
                  <label className="field">
                    <span className="field-label">
                      Amount <span className="req">*</span>
                    </span>
                    <input
                      inputMode="decimal"
                      value={detailForm.amount}
                      onChange={(e) => setDetailForm({ ...detailForm, amount: e.target.value })}
                      onBlur={(e) => {
                        const next = formatAmountOnBlur(e.target.value);
                        if (next !== detailForm.amount) setDetailForm({ ...detailForm, amount: next });
                      }}
                      required
                      placeholder="0.00"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Reference</span>
                    <input
                      value={detailForm.reference}
                      onChange={(e) => setDetailForm({ ...detailForm, reference: e.target.value })}
                      placeholder="N/A if blank"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Origin</span>
                    <input
                      value={detailForm.origin}
                      onChange={(e) => setDetailForm({ ...detailForm, origin: e.target.value })}
                      placeholder="N/A if blank"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Destination</span>
                    <input
                      value={detailForm.destination}
                      onChange={(e) => setDetailForm({ ...detailForm, destination: e.target.value })}
                      placeholder="N/A if blank"
                    />
                  </label>
                </div>
                <div className="entry-sheet-actions">
                  <button type="submit" className="btn primary" disabled={saveDetail.isPending}>
                    {saveDetail.isPending
                      ? 'Saving…'
                      : editDetailId
                        ? 'Save changes'
                        : 'Add detail line'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setEditDetailId(null);
                      setDetailForm(emptyDetail);
                      setShowDetailForm(false);
                    }}
                    disabled={saveDetail.isPending}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Modal>
          )}
          <div className="card">
            <div className="table-wrap ar-details-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Shipment date</th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th className="num">Amount</th>
                    <th>Billing date</th>
                    <th>Receiving date</th>
                    <th>Due date</th>
                    <th>Aging</th>
                    <th>Reference</th>
                    {canEdit && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {(details.data?.items ?? []).map((r) => (
                    <tr key={r.id}>
                      <td>{r.invoice_no}</td>
                      <td>{r.client_name}</td>
                      <td>{formatDateMdY(r.entry_date)}</td>
                      <td>{r.origin ?? '—'}</td>
                      <td>{r.destination ?? '—'}</td>
                      <td className="num">{formatMoney(r.amount)}</td>
                      <td>{formatDateMdY(r.billing_date)}</td>
                      <td>{formatDateMdY(r.receiving_date)}</td>
                      <td>{formatDateMdY(r.summary_due_date) || '—'}</td>
                      <td>
                        {r.aging_days == null ? '—' : `${r.aging_days}d`}
                      </td>
                      <td>{r.reference ?? '—'}</td>
                      {canEdit && (
                        <td>
                          <div className="row gap">
                            <button
                              type="button"
                              className="btn small"
                              onClick={() => {
                                setEditDetailId(r.id);
                                setDetailForm({
                                  invoice_no: r.invoice_no,
                                  entry_date: r.entry_date,
                                  billing_date: r.billing_date ?? '',
                                  receiving_date: r.receiving_date ?? '',
                                  reference: r.reference ?? '',
                                  origin: r.origin ?? '',
                                  destination: r.destination ?? '',
                                  amount: r.amount ? formatAmountPlain(r.amount) : '',
                                });
                                setShowDetailForm(true);
                                requestAnimationFrame(() => {
                                  detailFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn small danger"
                              onClick={() =>
                                setConfirm({
                                  title: 'Delete detail line',
                                  message: `Delete detail line for invoice ${r.invoice_no} (${formatMoney(r.amount)})?`,
                                  onConfirm: () => removeDetail.mutate(r.id),
                                })
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {details.isLoading && <p className="muted">Loading…</p>}
            {!details.isLoading && (details.data?.items.length ?? 0) === 0 && (
              <p className="muted">No detail lines. Upload an SI Excel workbook to import.</p>
            )}
          </div>
        </>
      )}

      {mode === 'summary' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Due date</th>
                  <th className="num">Aging</th>
                  <th className="num">Grand total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(summaries.data?.items ?? []).map((s) => {
                  const open = expandedId === s.id;
                  return (
                  <Fragment key={s.id}>
                    <tr
                      className={open ? 'expanded' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedId((id) => (id === s.id ? null : s.id))}
                    >
                      <td>{s.invoice_no}</td>
                      <td>{s.client_name}</td>
                      <td>{formatDateMdY(s.due_date) || '—'}</td>
                      <td className="num">
                        {s.aging_days == null
                          ? '—'
                          : s.payment_status === 'paid'
                            ? `${s.aging_days}d`
                            : (s.days_past_due ?? 0) > 0
                              ? `${s.aging_days}d (${s.days_past_due} overdue)`
                              : `${s.aging_days}d`}
                      </td>
                      <td className="num">{formatMoney(s.grand_total)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {canEdit ? (
                          <button
                            type="button"
                            className="btn ghost small"
                            onClick={() => setPaymentModalId(s.id)}
                          >
                            <span className={s.payment_status === 'paid' ? 'muted' : undefined}>
                              {s.payment_status}
                            </span>
                            {s.payment_status === 'paid' && s.acknowledgment_receipt_no
                              ? ` · ${s.acknowledgment_receipt_no}`
                              : ''}
                          </button>
                        ) : (
                          <>
                            <span className={s.payment_status === 'paid' ? 'muted' : undefined}>
                              {s.payment_status}
                            </span>
                            {s.payment_status === 'paid' && s.acknowledgment_receipt_no
                              ? ` · ${s.acknowledgment_receipt_no}`
                              : ''}
                          </>
                        )}
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6}>
                          <div className="form-section">
                            <h3 className="form-section-title">Invoice {s.invoice_no}</h3>
                            <dl className="meta-grid" style={{ marginBottom: '1rem' }}>
                              <div>
                                <dt>Billing ref</dt>
                                <dd>{s.billing_reference ?? '—'}</dd>
                              </div>
                              <div>
                                <dt>Trip</dt>
                                <dd>
                                  {[s.trip_type, s.trip_classification, s.fleet_type, s.service_type]
                                    .filter(Boolean)
                                    .join(' / ') || '—'}
                                </dd>
                              </div>
                              <div>
                                <dt>Coverage</dt>
                                <dd>
                                  {s.coverage_start && s.coverage_end
                                    ? `${s.coverage_start} → ${s.coverage_end}`
                                    : '—'}
                                </dd>
                              </div>
                              <div>
                                <dt>Billing date</dt>
                                <dd>{s.invoice_date ?? '—'}</dd>
                              </div>
                              <div>
                                <dt>VATex</dt>
                                <dd>{formatMoney(s.total_sales_vatex)}</dd>
                              </div>
                              <div>
                                <dt>VAT</dt>
                                <dd>{formatMoney(s.vat_amount)}</dd>
                              </div>
                              <div>
                                <dt>VATinc</dt>
                                <dd>{formatMoney(s.total_sales_vatinc)}</dd>
                              </div>
                              <div>
                                <dt>EWT</dt>
                                <dd>{formatMoney(s.ewt_amount)}</dd>
                              </div>
                              <div>
                                <dt>Total after EWT</dt>
                                <dd>{formatMoney(s.total_after_ewt)}</dd>
                              </div>
                              <div>
                                <dt>Deductions</dt>
                                <dd>{formatMoney(s.deductions_total)}</dd>
                              </div>
                              <div>
                                <dt>2307</dt>
                                <dd>{s.ewt_2307_status}</dd>
                              </div>
                            </dl>
                            {canEdit && (
                              <label className="field" style={{ maxWidth: 280 }}>
                                <span className="field-label">Trip classification (override)</span>
                                <select
                                  value={summaryDetail.data?.trip_classification ?? s.trip_classification ?? ''}
                                  onChange={(e) => patchClass.mutate(e.target.value)}
                                >
                                  <option value="">—</option>
                                  <option value="FORWARD HAUL">FORWARD HAUL</option>
                                  <option value="BACK HAUL">BACK HAUL</option>
                                </select>
                              </label>
                            )}

                            <h4>Payment</h4>
                            <div className="entry-sheet-grid" style={{ maxWidth: 720 }}>
                              <label className="field">
                                <span className="field-label">Status</span>
                                <select
                                  value={paymentDraft.payment_status}
                                  disabled={!canEdit}
                                  onChange={(e) =>
                                    setPaymentDraft((d) => ({
                                      ...d,
                                      payment_status: e.target.value as 'unpaid' | 'paid',
                                    }))
                                  }
                                >
                                  <option value="unpaid">Unpaid</option>
                                  <option value="paid">Paid</option>
                                </select>
                              </label>
                              <label className="field">
                                <span className="field-label">Due date</span>
                                <input
                                  type="date"
                                  value={paymentDraft.due_date}
                                  disabled={!canEdit}
                                  onChange={(e) =>
                                    setPaymentDraft((d) => ({ ...d, due_date: e.target.value }))
                                  }
                                />
                                <span className="hint">
                                  Default is billing date + due days from Settings
                                </span>
                              </label>
                              <label className="field">
                                <span className="field-label">
                                  Acknowledgment receipt no.
                                  {paymentDraft.payment_status === 'paid' ? (
                                    <span className="req"> *</span>
                                  ) : null}
                                </span>
                                <input
                                  value={paymentDraft.acknowledgment_receipt_no}
                                  disabled={!canEdit}
                                  required={paymentDraft.payment_status === 'paid'}
                                  placeholder={
                                    paymentDraft.payment_status === 'paid'
                                      ? 'Required when paid'
                                      : 'Optional'
                                  }
                                  onChange={(e) =>
                                    setPaymentDraft((d) => ({
                                      ...d,
                                      acknowledgment_receipt_no: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                className="btn small"
                                style={{ marginTop: 8 }}
                                disabled={
                                  patchPayment.isPending ||
                                  (paymentDraft.payment_status === 'paid' &&
                                    !paymentDraft.acknowledgment_receipt_no.trim())
                                }
                                onClick={() => patchPayment.mutate(s.id)}
                              >
                                {patchPayment.isPending ? 'Saving…' : 'Save payment'}
                              </button>
                            )}
                            <p className="muted small" style={{ marginTop: 8 }}>
                              Aging:{' '}
                              {s.aging_days == null
                                ? '—'
                                : `${s.aging_days} day(s) since ${
                                    s.aging_start_date &&
                                    s.invoice_date &&
                                    s.aging_start_date !== s.invoice_date
                                      ? `receiving ${s.aging_start_date}`
                                      : `billing ${s.aging_start_date ?? s.invoice_date ?? '—'}`
                                  }`}
                              {s.due_date && s.invoice_date
                                ? ` · terms ${s.due_date} (from billing ${s.invoice_date})`
                                : ''}
                              {(s.days_past_due ?? 0) > 0 && s.payment_status !== 'paid'
                                ? ` · ${s.days_past_due} day(s) past due`
                                : ''}
                            </p>

                            <h4>Deduction charges</h4>
                            <ul>
                              {(summaryDetail.data?.deductions ?? []).map((d) => (
                                <li key={d.id} className="row gap">
                                  <span>
                                    {d.description}: {formatMoney(d.amount)}
                                  </span>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      className="btn small danger"
                                      onClick={() =>
                                        setConfirm({
                                          title: 'Remove deduction',
                                          message: `Remove deduction “${d.description}” (${formatMoney(d.amount)})?`,
                                          confirmLabel: 'Remove',
                                          onConfirm: () => removeDeduction.mutate(d.id),
                                        })
                                      }
                                    >
                                      Remove
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                            {canEdit && (
                              <form
                                className="deduction-add-row"
                                onSubmit={(e: FormEvent) => {
                                  e.preventDefault();
                                  addDeduction.mutate();
                                }}
                              >
                                <select
                                  value={deduction.description}
                                  onChange={(e) => setDeduction({ ...deduction, description: e.target.value })}
                                  required
                                >
                                  <option value="">Description…</option>
                                  {(deductionDescriptions.data ?? []).map((d) => (
                                    <option key={d.id} value={d.name}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  inputMode="decimal"
                                  placeholder="Amount"
                                  value={deduction.amount}
                                  onChange={(e) => setDeduction({ ...deduction, amount: e.target.value })}
                                  onBlur={(e) => {
                                    const next = formatAmountOnBlur(e.target.value);
                                    if (next !== deduction.amount) setDeduction({ ...deduction, amount: next });
                                  }}
                                  required
                                />
                                <button
                                  type="submit"
                                  className="btn small"
                                  disabled={(deductionDescriptions.data?.length ?? 0) === 0}
                                >
                                  Add deduction
                                </button>
                              </form>
                            )}
                            {canEdit && (deductionDescriptions.data?.length ?? 0) === 0 && (
                              <p className="muted small">
                                Add deduction descriptions under Masterdata → AR deduction descriptions.
                              </p>
                            )}

                            <h4>BIR 2307 (EWT)</h4>
                            <p>
                              Status: <strong>{summaryDetail.data?.ewt_2307_status ?? s.ewt_2307_status}</strong>
                              {summaryDetail.data?.ewt_2307_submitted_at || s.ewt_2307_submitted_at
                                ? ` · ${summaryDetail.data?.ewt_2307_submitted_at ?? s.ewt_2307_submitted_at}`
                                : ''}
                            </p>
                            {(summaryDetail.data?.ewt_2307_original_name || s.ewt_2307_original_name) && (
                              <p>
                                File:{' '}
                                <a href={ar2307FileUrl(s.id)} target="_blank" rel="noreferrer">
                                  {summaryDetail.data?.ewt_2307_original_name ?? s.ewt_2307_original_name}
                                </a>
                              </p>
                            )}
                            {canEdit && (summaryDetail.data?.ewt_2307_status ?? s.ewt_2307_status) === 'pending' && (
                              <div className="row gap" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                                <input
                                  type="date"
                                  value={submit2307Date}
                                  onChange={(e) => setSubmit2307Date(e.target.value)}
                                />
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,application/pdf"
                                  onChange={(e) => setFile2307(e.target.files?.[0] ?? null)}
                                />
                                <button
                                  type="button"
                                  className="btn small"
                                  disabled={patch2307.isPending || !file2307}
                                  onClick={() =>
                                    patch2307.mutate({
                                      ewt_2307_status: 'submitted',
                                      ewt_2307_submitted_at: submit2307Date,
                                      file: file2307,
                                    })
                                  }
                                >
                                  {patch2307.isPending ? 'Submitting…' : 'Submit 2307'}
                                </button>
                              </div>
                            )}
                            {canEdit && (summaryDetail.data?.ewt_2307_status ?? s.ewt_2307_status) === 'submitted' && (
                              <button
                                type="button"
                                className="btn ghost small"
                                disabled={patch2307.isPending}
                                onClick={() =>
                                  patch2307.mutate({ ewt_2307_status: 'pending', ewt_2307_submitted_at: null })
                                }
                              >
                                Revert to pending
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {summaries.isLoading && <p className="muted">Loading…</p>}
          {!summaries.isLoading && (summaries.data?.items.length ?? 0) === 0 && (
            <p className="muted">No summaries for this filter.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        request={confirm}
        pending={removeDetail.isPending || removeDeduction.isPending}
        onClose={() => setConfirm(null)}
      />

      {paymentModalId != null && (
        <Modal
          title={`Update payment · ${
            summaries.data?.items.find((s) => s.id === paymentModalId)?.invoice_no ?? ''
          }`}
          onClose={() => setPaymentModalId(null)}
        >
          <form
            className="status-change-form"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (
                paymentDraft.payment_status === 'paid' &&
                !paymentDraft.acknowledgment_receipt_no.trim()
              ) {
                setError('Acknowledgment receipt no. is required when marking paid.');
                return;
              }
              patchPayment.mutate(paymentModalId);
            }}
          >
            <label>
              Status
              <select
                value={paymentDraft.payment_status}
                onChange={(e) =>
                  setPaymentDraft((d) => ({
                    ...d,
                    payment_status: e.target.value as 'unpaid' | 'paid',
                  }))
                }
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            {paymentDraft.payment_status === 'paid' && (
              <label>
                Acknowledgment receipt no. *
                <input
                  required
                  value={paymentDraft.acknowledgment_receipt_no}
                  onChange={(e) =>
                    setPaymentDraft((d) => ({
                      ...d,
                      acknowledgment_receipt_no: e.target.value,
                    }))
                  }
                  placeholder="Required when paid"
                />
              </label>
            )}
            <ErrorBox error={error} />
            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={patchPayment.isPending}>
                {patchPayment.isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setPaymentModalId(null)}
                disabled={patchPayment.isPending}
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
