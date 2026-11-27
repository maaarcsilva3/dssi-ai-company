export type YearPivotRow = {
  company: string;
  months: number[];
};

export type YearPivotResult = {
  year: number;
  rows: YearPivotRow[];
  columnTotals: number[];
};

const MONTHS_IN_YEAR = 12;

export function buildYearPivot(
  year: number,
  aggregates: { company: string; monthNum: number; total: number }[],
): YearPivotResult {
  const byCompany = new Map<string, number[]>();

  for (const row of aggregates) {
    if (row.monthNum < 1 || row.monthNum > MONTHS_IN_YEAR) continue;
    let months = byCompany.get(row.company);
    if (!months) {
      months = Array.from({ length: MONTHS_IN_YEAR }, () => 0);
      byCompany.set(row.company, months);
    }
    months[row.monthNum - 1] += row.total;
  }

  const rows: YearPivotRow[] = [...byCompany.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(([company, months]) => ({
      company,
      months: months.map((n) => roundMoney(n)),
    }));

  const columnTotals = Array.from({ length: MONTHS_IN_YEAR }, (_, i) =>
    roundMoney(rows.reduce((sum, r) => sum + r.months[i], 0)),
  );

  return { year, rows, columnTotals };
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}