import * as XLSX from 'xlsx';
import { formatDateMdY } from '../format';

type SummaryExportRow = {
  client_name: string;
  invoice_no: string;
  billing_reference: string | null;
  trip_type: string | null;
  trip_classification: string | null;
  fleet_type: string | null;
  service_type: string | null;
  coverage_start: string | null;
  coverage_end: string | null;
  invoice_date: string | null;
  due_date: string | null;
  payment_status: string;
  total_sales_vatex: string;
  vat_amount: string;
  total_sales_vatinc: string;
  ewt_amount: string;
  total_after_ewt: string;
  deductions_total: string;
  grand_total: string;
  detail_count: number;
  ewt_2307_status: string;
  aging_days: number | null;
  days_past_due: number | null;
};

type DetailExportRow = {
  client_name: string;
  invoice_no: string;
  billing_reference?: string | null;
  trip_type?: string | null;
  trip_classification?: string | null;
  fleet_type?: string | null;
  service_type?: string | null;
  coverage_start?: string | null;
  coverage_end?: string | null;
  billing_date: string | null;
  due_date?: string | null;
  reference: string | null;
  origin: string | null;
  destination: string | null;
  entry_date: string;
  amount: string;
  payment_status?: string;
  grand_total?: string;
};

function isoCell(iso: string | null | undefined): string | null {
  return iso || null;
}

export function downloadArMonthlySummary(rows: SummaryExportRow[], month: string) {
  const sheetRows = rows.length
    ? rows.map((s) => ({
        Client: s.client_name,
        'Invoice No.': s.invoice_no,
        'Billing Reference': s.billing_reference ?? '',
        'Trip Type': s.trip_type ?? '',
        'Trip Classification': s.trip_classification ?? '',
        'Fleet Type': s.fleet_type ?? '',
        'Service Type': s.service_type ?? '',
        'Coverage Start': isoCell(s.coverage_start),
        'Coverage End': isoCell(s.coverage_end),
        'Invoice Date': isoCell(s.invoice_date),
        'Due Date': isoCell(s.due_date),
        'Due Date (display)': formatDateMdY(s.due_date),
        'Payment Status': s.payment_status,
        'VATex Sales': Number(s.total_sales_vatex),
        'VAT Amount': Number(s.vat_amount),
        'VATinc Sales': Number(s.total_sales_vatinc),
        EWT: Number(s.ewt_amount),
        'Total After EWT': Number(s.total_after_ewt),
        Deductions: Number(s.deductions_total),
        'Grand Total': Number(s.grand_total),
        'Detail Line Count': s.detail_count,
        '2307 Status': s.ewt_2307_status,
        'Aging Days': s.aging_days ?? '',
        'Days Past Due': s.days_past_due ?? '',
      }))
    : [
        {
          Client: 'No data for selected filters',
        },
      ];
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly summary');
  XLSX.writeFile(wb, `ar-monthly-summary-${month}.xlsx`);
}

export function downloadArSalesReport(rows: DetailExportRow[], month: string) {
  const sheetRows = rows.length
    ? rows.map((d) => ({
        Client: d.client_name,
        'Invoice No.': d.invoice_no,
        'Billing Reference': d.billing_reference ?? '',
        'Trip Type': d.trip_type ?? '',
        'Trip Classification': d.trip_classification ?? '',
        Fleet: d.fleet_type ?? '',
        Service: d.service_type ?? '',
        'Coverage Start': isoCell(d.coverage_start ?? null),
        'Coverage End': isoCell(d.coverage_end ?? null),
        'Billing Date': isoCell(d.billing_date),
        'Due Date': isoCell(d.due_date ?? null),
        'Waybill / Reference': d.reference ?? '',
        Origin: d.origin ?? '',
        Destination: d.destination ?? '',
        'Trip Date': isoCell(d.entry_date),
        'Line Amount': Number(d.amount),
        'Payment Status': d.payment_status ?? '',
        'Grand Total (invoice)': d.grand_total != null ? Number(d.grand_total) : '',
      }))
    : [{ Client: 'No data for selected filters' }];
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales report');
  XLSX.writeFile(wb, `ar-sales-report-${month}.xlsx`);
}