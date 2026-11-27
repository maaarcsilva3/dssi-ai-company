import { useQuery } from '@tanstack/react-query';
import { api, errorMessage, type Payable } from '../api';
import { formatDate, formatMoney } from '../format';
import { ErrorBox } from '../components';
import { useLedger } from '../ledger';
import { usePaymentTerms } from '../hooks';

/** Expandable row that loads and lists invoice lines for a multi-invoice payable. */
export function InvoiceLinesPanel({ payableId, colSpan }: { payableId: number; colSpan: number }) {
  const ledger = useLedger();
  const terms = usePaymentTerms(true);
  const detail = useQuery({
    queryKey: ['ledger', ledger.kind, 'detail', payableId],
    queryFn: () => api.get<Payable>(`${ledger.apiBase}/${payableId}`),
  });
  const invoices = detail.data?.invoices ?? [];
  const sharedPdcByInvoice = new Map(
    (detail.data?.pdc_groups ?? []).flatMap((g) => g.invoice_ids.map((id) => [id, g] as const)),
  );
  const showPdc = invoices.some((inv) => inv.pdc_lines?.length || sharedPdcByInvoice.has(inv.id));
  const invoiceNumber = (id: number) => invoices.findIndex((inv) => inv.id === id) + 1;
  const sharedPdcCell = (invoiceId: number) => {
    const group = sharedPdcByInvoice.get(invoiceId);
    return (
      group && (
        <div className="small">
          Shared: {group.pdc_no ?? '-'} · {group.pdc_date ? formatDate(group.pdc_date) : '-'} · {formatMoney(group.amount)}
          <div className="muted">for #{group.invoice_ids.map(invoiceNumber).join(', #')}</div>
        </div>
      )
    );
  };

  return (
    <tr className="invoice-accordion-row">
      <td colSpan={colSpan}>
        {detail.isLoading && <p className="muted small">Loading invoices...</p>}
        {detail.error && <ErrorBox error={errorMessage(detail.error)} />}
        {detail.isSuccess && invoices.length === 0 && <p className="muted small">No invoice lines.</p>}
        {invoices.length > 0 && (
          <table className="invoice-lines-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Invoice no.</th>
                <th>Invoice date</th>
                <th>Payment terms</th>
                <th>Due date</th>
                <th className="num">Gross</th>
                <th className="num">VAT</th>
                <th className="num">Net sales</th>
                <th className="num">EWT</th>
                <th className="num">Total net</th>
                {showPdc && <th>PDC</th>}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id ?? i}>
                  <td>{i + 1}</td>
                  <td>{inv.invoice_no ?? <span className="muted">-</span>}</td>
                  <td>{inv.invoice_date ? formatDate(inv.invoice_date) : <span className="muted">-</span>}</td>
                  <td>
                    <select value={inv.payment_term_id ?? ''} disabled aria-label={`Invoice ${i + 1} payment terms`}>
                      <option value="">Manual</option>
                      {terms.data?.map((term) => (
                        <option key={term.id} value={term.id}>{term.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      value={inv.due_date ?? ''}
                      readOnly
                      aria-label={`Invoice ${i + 1} due date`}
                    />
                  </td>
                  <td className="num">{formatMoney(inv.gross_amount)}</td>
                  <td className="num">{formatMoney(inv.vat_amount)}</td>
                  <td className="num">{formatMoney(Number(inv.gross_amount) - Number(inv.vat_amount))}</td>
                  <td className="num">{formatMoney(inv.ewt_amount)}</td>
                  <td className="num">{formatMoney(inv.net_amount)}</td>
                  {showPdc && (
                    <td>
                      {sharedPdcCell(inv.id) ??
                        (inv.pdc_lines?.length ? (
                          inv.pdc_lines.map((line) => (
                            <div key={line.id} className="small">
                              {line.pdc_no ?? '-'} · {line.pdc_date ? formatDate(line.pdc_date) : '-'} ·{' '}
                              {formatMoney(line.amount)}
                            </div>
                          ))
                        ) : (
                          <span className="muted">-</span>
                        ))}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </td>
    </tr>
  );
}
