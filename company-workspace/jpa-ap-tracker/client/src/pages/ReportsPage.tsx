import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, errorMessage, qs, type ReportsPayload, type ReportPeriodKind } from '../api';
import { ErrorBox } from '../components';
import { addDays, formatDate, formatMoney } from '../format';
import { TelegramLinkPanel } from '../components/TelegramLinkPanel';
import { AmountBarChart, AmountDoughnutChart, CHART_COLORS } from '../reportCharts';

const REPORT_TABLE_PAGE_SIZE = 10;

function todayLocal(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function lastDayOfMonth(year: number, month1to12: number): string {
  return new Date(Date.UTC(year, month1to12, 0)).toISOString().slice(0, 10);
}

function shiftAnchor(kind: ReportPeriodKind, anchor: string, delta: -1 | 1): string {
  if (kind === 'week') return addDays(anchor, delta * 7);
  const [y, m, d] = anchor.split('-').map(Number);
  if (kind === 'month') {
    const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
    const maxDay = Number(lastDayOfMonth(dt.getUTCFullYear(), dt.getUTCMonth() + 1).slice(8, 10));
    dt.setUTCDate(Math.min(d, maxDay));
    return dt.toISOString().slice(0, 10);
  }
  return `${y + delta}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) lines.push(row.map(csvEscape).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function NamedTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; count: number; amount: string }[];
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="muted">No data.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">Count</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td className="num">{r.count}</td>
                  <td className="num">{formatMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriodKind>('month');
  const [anchor, setAnchor] = useState(todayLocal);
  const [ledger, setLedger] = useState<'payables' | 'receivables'>('payables');
  const [remarksPage, setRemarksPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const copy =
    ledger === 'receivables'
      ? {
          paid: 'Collected in period',
          unit: 'collection',
          aging: 'Open AR (aging)',
          agingTitle: 'Open AR aging',
          vat: 'VAT (collected)',
          vatTitle: 'VAT & EWT (collected in period)',
          party: 'By customer',
          done: 'collected',
          doc: 'Receivable',
          path: '/receivables',
          file: 'ar-report',
          partyCol: 'Customer',
          paidSection: 'Collected breakdowns',
          timingTitle: 'On-time vs late (collected in period)',
          invoiceHint: 'Invoices on receivables collected or due in the selected period (max 1,000).',
          exportLabel: 'Export collected-by-customer CSV',
          exportFile: 'collected-by-customer',
        }
      : {
          paid: 'Paid in period',
          unit: 'payment',
          aging: 'Open AP (aging)',
          agingTitle: 'Open AP aging',
          vat: 'VAT (paid)',
          vatTitle: 'VAT & EWT (paid in period)',
          party: 'By supplier',
          done: 'paid',
          doc: 'Payable',
          path: '/payables',
          file: 'ap-report',
          partyCol: 'Client',
          paidSection: 'Paid breakdowns',
          timingTitle: 'On-time vs late (paid in period)',
          invoiceHint: 'Invoices on payables paid or due in the selected period (max 1,000).',
          exportLabel: 'Export paid-by-client CSV',
          exportFile: 'paid-by-client',
        };

  const report = useQuery({
    queryKey: ['reports', ledger, period, anchor],
    queryFn: () => api.get<ReportsPayload>(`/reports${qs({ period, anchor, ledger })}`),
    placeholderData: keepPreviousData,
  });

  const data = report.data;
  const slug = useMemo(() => {
    if (!data) return 'report';
    return `${copy.file}-${data.period.kind}-${data.period.start}_${data.period.end}`;
  }, [data, copy.file]);

  useEffect(() => {
    setRemarksPage(1);
    setInvoicesPage(1);
  }, [ledger, period, anchor]);

  const remarksTotal = data?.status_remarks.length ?? 0;
  const remarksTotalPages = Math.max(1, Math.ceil(remarksTotal / REPORT_TABLE_PAGE_SIZE));
  const remarksPageSafe = Math.min(remarksPage, remarksTotalPages);
  const remarksSlice = useMemo(() => {
    if (!data?.status_remarks.length) return [];
    const start = (remarksPageSafe - 1) * REPORT_TABLE_PAGE_SIZE;
    return data.status_remarks.slice(start, start + REPORT_TABLE_PAGE_SIZE);
  }, [data?.status_remarks, remarksPageSafe]);

  const invoicesTotal = data?.invoices.length ?? 0;
  const invoicesTotalPages = Math.max(1, Math.ceil(invoicesTotal / REPORT_TABLE_PAGE_SIZE));
  const invoicesPageSafe = Math.min(invoicesPage, invoicesTotalPages);
  const invoicesSlice = useMemo(() => {
    if (!data?.invoices.length) return [];
    const start = (invoicesPageSafe - 1) * REPORT_TABLE_PAGE_SIZE;
    return data.invoices.slice(start, start + REPORT_TABLE_PAGE_SIZE);
  }, [data?.invoices, invoicesPageSafe]);

  const exportPaidBreakdown = () => {
    if (!data) return;
    downloadCsv(
      `${slug}-${copy.exportFile}.csv`,
      [copy.partyCol, 'Count', 'Amount'],
      data.paid.by_client.map((r) => [r.name, r.count, r.amount]),
    );
  };

  const exportInvoices = () => {
    if (!data) return;
    downloadCsv(
      `${slug}-invoices.csv`,
      [`${copy.doc} ID`, copy.partyCol, 'Invoice No', 'Invoice Date', 'Gross', 'VAT', 'EWT', 'Net', 'Due', 'Paid', 'Status'],
      data.invoices.map((r) => [
        r.payable_id,
        r.client_name,
        r.invoice_no,
        r.invoice_date,
        r.gross_amount,
        r.vat_amount,
        r.ewt_amount,
        r.net_amount,
        r.due_date,
        r.paid_at,
        r.status_name,
      ]),
    );
  };

  const exportRemarks = () => {
    if (!data) return;
    downloadCsv(
      `${slug}-status-remarks.csv`,
      ['When', `${copy.doc} ID`, copy.partyCol, 'From', 'To', 'Remarks', 'Reference', 'Paid At'],
      data.status_remarks.map((r) => [
        r.created_at,
        r.payable_id,
        r.client_name,
        r.from_status,
        r.to_status,
        r.remarks,
        r.payment_reference,
        r.paid_at,
      ]),
    );
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="muted">Admin summaries for the selected period. Aging is a live snapshot.</p>
        </div>
      </div>

      <TelegramLinkPanel />

      <div className="card filters report-controls">
        <div className="row report-period-toggle" role="group" aria-label="Ledger">
          <button type="button" className={`btn small ${ledger === 'payables' ? 'primary' : ''}`} onClick={() => setLedger('payables')}>
            Payables
          </button>
          <button type="button" className={`btn small ${ledger === 'receivables' ? 'primary' : ''}`} onClick={() => setLedger('receivables')}>
            Receivables
          </button>
        </div>
        <div className="row report-period-toggle" role="group" aria-label="Period">
          {(['week', 'month', 'year'] as ReportPeriodKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`btn small ${period === k ? 'primary' : ''}`}
              onClick={() => setPeriod(k)}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <div className="row">
          <button type="button" className="btn small" onClick={() => setAnchor((a) => shiftAnchor(period, a, -1))}>
            Previous
          </button>
          <button type="button" className="btn small" onClick={() => setAnchor(todayLocal())}>
            Today
          </button>
          <button type="button" className="btn small" onClick={() => setAnchor((a) => shiftAnchor(period, a, 1))}>
            Next
          </button>
        </div>
        <label>
          Anchor date
          <input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
        </label>
        {data && (
          <p className="report-range">
            <strong>{data.period.label}</strong>
            <span className="muted">
              {' '}
              ({formatDate(data.period.start)} – {formatDate(data.period.end)})
            </span>
          </p>
        )}
      </div>

      <ErrorBox error={report.isError ? errorMessage(report.error) : null} />
      {report.isLoading && !data && <p>Loading report…</p>}

      {data && (
        <>
          <div className="summary report-summary">
            <div>
              <div className="label">{copy.paid}</div>
              <div className="value">{formatMoney(data.paid.amount)}</div>
              <div className="muted">{data.paid.count} {copy.unit}{data.paid.count === 1 ? '' : 's'}</div>
            </div>
            <div>
              <div className="label">Due in period</div>
              <div className="value">{formatMoney(data.due.amount)}</div>
              <div className="muted">
                {data.due.open_count} open · {data.due.paid_count} {copy.done}
              </div>
            </div>
            <div>
              <div className="label">{copy.aging}</div>
              <div className="value">{formatMoney(data.aging.total_amount)}</div>
              <div className="muted">
                {data.aging.total_count} open as of {formatDate(data.aging.as_of)}
              </div>
            </div>
            <div>
              <div className="label">{copy.vat}</div>
              <div className="value">{formatMoney(data.vat_ewt.vat_amount)}</div>
              <div className="muted">EWT {formatMoney(data.vat_ewt.ewt_amount)}</div>
            </div>
          </div>

          <div className="card">
            <h2>{copy.vatTitle}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Gross</th>
                    <th className="num">VAT</th>
                    <th className="num">EWT products</th>
                    <th className="num">EWT service</th>
                    <th className="num">EWT total</th>
                    <th className="num">Net</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="num">{formatMoney(data.vat_ewt.gross_amount)}</td>
                    <td className="num">{formatMoney(data.vat_ewt.vat_amount)}</td>
                    <td className="num">{formatMoney(data.vat_ewt.ewt_products)}</td>
                    <td className="num">{formatMoney(data.vat_ewt.ewt_service)}</td>
                    <td className="num">{formatMoney(data.vat_ewt.ewt_amount)}</td>
                    <td className="num">{formatMoney(data.vat_ewt.net_amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="report-split">
            <div className="card">
              <h2>{copy.agingTitle}</h2>
              <AmountBarChart
                horizontal
                labels={data.aging.buckets.map((b) => b.label)}
                values={data.aging.buckets.map((b) => Number(b.amount))}
                colors={CHART_COLORS.aging}
              />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Bucket</th>
                      <th className="num">Count</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.aging.buckets.map((b) => (
                      <tr key={b.bucket}>
                        <td>{b.label}</td>
                        <td className="num">{b.count}</td>
                        <td className="num">{formatMoney(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2>{copy.timingTitle}</h2>
              <AmountDoughnutChart
                labels={data.timing.map((t) => t.label)}
                values={data.timing.map((t) => Number(t.amount))}
                colors={CHART_COLORS.timing}
              />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Timing</th>
                      <th className="num">Count</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.timing.map((t) => (
                      <tr key={t.timing}>
                        <td>{t.label}</td>
                        <td className="num">{t.count}</td>
                        <td className="num">{formatMoney(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Assignee workload (due in period)</h2>
            {data.assignees.length === 0 ? (
              <p className="muted">No data.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Assignee</th>
                      <th className="num">Total</th>
                      <th className="num">Open</th>
                      <th className="num">Paid</th>
                      <th className="num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assignees.map((a) => (
                      <tr key={a.name}>
                        <td>{a.name}</td>
                        <td className="num">{a.count}</td>
                        <td className="num">
                          {a.open_count} ({formatMoney(a.open_amount)})
                        </td>
                        <td className="num">
                          {a.paid_count} ({formatMoney(a.paid_amount)})
                        </td>
                        <td className="num">{formatMoney(a.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <h2 className="report-section-title">{copy.paidSection}</h2>
          <div className="report-split">
            <div className="card">
              <h3>By payment type</h3>
              <AmountBarChart
                labels={data.paid.by_type.map((r) => r.name)}
                values={data.paid.by_type.map((r) => Number(r.amount))}
              />
            </div>
            <div className="card">
              <h3>By payment method</h3>
              <AmountBarChart
                labels={data.paid.by_method.map((r) => r.name)}
                values={data.paid.by_method.map((r) => Number(r.amount))}
              />
            </div>
          </div>
          <div className="report-grid">
            <NamedTable title={copy.party} rows={data.paid.by_client} />
            <NamedTable title="By payment type" rows={data.paid.by_type} />
            <NamedTable title="By payment method" rows={data.paid.by_method} />
          </div>
          <div className="row" style={{ marginBottom: '1rem' }}>
            <button type="button" className="btn small" onClick={exportPaidBreakdown} disabled={!data.paid.by_client.length}>
              {copy.exportLabel}
            </button>
          </div>

          <h2 className="report-section-title">Due breakdowns</h2>
          <div className="report-grid">
            <NamedTable title={copy.party} rows={data.due.by_client} />
            <NamedTable title="By payment type" rows={data.due.by_type} />
            <NamedTable title="By payment method" rows={data.due.by_method} />
          </div>

          <div className="card">
            <div className="page-header">
              <h2>Status history remarks</h2>
              <button type="button" className="btn small" onClick={exportRemarks} disabled={!data.status_remarks.length}>
                Export CSV
              </button>
            </div>
            {data.status_remarks.length === 0 ? (
              <p className="muted">No remarks in this period.</p>
            ) : (
              <>
                <p className="muted hint">
                  Showing {(remarksPageSafe - 1) * REPORT_TABLE_PAGE_SIZE + 1}–
                  {Math.min(remarksPageSafe * REPORT_TABLE_PAGE_SIZE, remarksTotal)} of {remarksTotal}
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>{copy.doc}</th>
                        <th>{copy.partyCol}</th>
                        <th>Change</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {remarksSlice.map((r) => (
                        <tr key={r.id}>
                          <td>{new Date(r.created_at).toLocaleString()}</td>
                          <td>
                            <Link to={`${copy.path}/${r.payable_id}`}>#{r.payable_id}</Link>
                          </td>
                          <td>{r.client_name}</td>
                          <td>
                            {r.from_status ?? '—'} → {r.to_status}
                          </td>
                          <td>{r.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {remarksTotalPages > 1 && (
                  <div className="pager">
                    <button
                      type="button"
                      className="btn small"
                      disabled={remarksPageSafe <= 1}
                      onClick={() => setRemarksPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <span>
                      Page {remarksPageSafe} of {remarksTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn small"
                      disabled={remarksPageSafe >= remarksTotalPages}
                      onClick={() => setRemarksPage((p) => Math.min(remarksTotalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="page-header">
              <h2>Invoice lines</h2>
              <button type="button" className="btn small" onClick={exportInvoices} disabled={!data.invoices.length}>
                Export CSV
              </button>
            </div>
            <p className="muted hint">{copy.invoiceHint}</p>
            {data.invoices.length === 0 ? (
              <p className="muted">No invoice lines.</p>
            ) : (
              <>
                <p className="muted hint">
                  Showing {(invoicesPageSafe - 1) * REPORT_TABLE_PAGE_SIZE + 1}–
                  {Math.min(invoicesPageSafe * REPORT_TABLE_PAGE_SIZE, invoicesTotal)} of {invoicesTotal}
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{copy.doc}</th>
                        <th>{copy.partyCol}</th>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th className="num">Gross</th>
                        <th className="num">VAT</th>
                        <th className="num">EWT</th>
                        <th className="num">Net</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoicesSlice.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <Link to={`${copy.path}/${r.payable_id}`}>#{r.payable_id}</Link>
                          </td>
                          <td>{r.client_name}</td>
                          <td>{r.invoice_no ?? '—'}</td>
                          <td>{formatDate(r.invoice_date)}</td>
                          <td className="num">{formatMoney(r.gross_amount)}</td>
                          <td className="num">{formatMoney(r.vat_amount)}</td>
                          <td className="num">{formatMoney(r.ewt_amount)}</td>
                          <td className="num">{formatMoney(r.net_amount)}</td>
                          <td>{r.status_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {invoicesTotalPages > 1 && (
                  <div className="pager">
                    <button
                      type="button"
                      className="btn small"
                      disabled={invoicesPageSafe <= 1}
                      onClick={() => setInvoicesPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <span>
                      Page {invoicesPageSafe} of {invoicesTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn small"
                      disabled={invoicesPageSafe >= invoicesTotalPages}
                      onClick={() => setInvoicesPage((p) => Math.min(invoicesTotalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
