import { describe, expect, it } from 'vitest';
import { buildYearPivot } from './arYearPivot';

describe('buildYearPivot', () => {
  it('pivots company totals into 12 months with column sums', () => {
    const result = buildYearPivot(2026, [
      { company: 'Beta Co', monthNum: 1, total: 100 },
      { company: 'Alpha Co', monthNum: 1, total: 50 },
      { company: 'Alpha Co', monthNum: 2, total: 25.5 },
      { company: 'Beta Co', monthNum: 1, total: 10 },
    ]);

    expect(result.year).toBe(2026);
    expect(result.rows.map((r) => r.company)).toEqual(['Alpha Co', 'Beta Co']);
    expect(result.rows[0].months).toEqual([50, 25.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(result.rows[1].months[0]).toBe(110);
    expect(result.columnTotals[0]).toBe(160);
    expect(result.columnTotals[1]).toBe(25.5);
    expect(result.columnTotals[2]).toBe(0);
  });
});