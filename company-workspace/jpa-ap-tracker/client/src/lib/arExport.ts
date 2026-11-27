import * as XLSX from 'xlsx';

export type YearPivotExport = {
  year: number;
  rows: { company: string; months: number[] }[];
  columnTotals: number[];
};

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function pivotRow(company: string, months: number[]): Record<string, string | number> {
  const row: Record<string, string | number> = { Company: company };
  for (let i = 0; i < MONTH_LABELS.length; i++) {
    row[MONTH_LABELS[i]] = months[i] ?? 0;
  }
  return row;
}

export function downloadArMonthlySummaryYearPivot(data: YearPivotExport) {
  const sheetRows: Record<string, string | number>[] = data.rows.map((r) =>
    pivotRow(r.company, r.months),
  );

  if (data.rows.length) {
    sheetRows.push(pivotRow('Grand Total', data.columnTotals));
  } else {
    sheetRows.push({
      Company: `No AR summary data for ${data.year}`,
    });
  }

  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly summary');
  XLSX.writeFile(wb, `ar-monthly-summary-${data.year}.xlsx`);
}