import { describe, expect, it } from 'vitest';
import { assertSharedBatchPutAllowed, detectCrossPayableSharedPdc } from './payableSharedPdcBatch';

describe('detectCrossPayableSharedPdc', () => {
  it('detects mode B (one line, same no/date)', () => {
    const shared = { pdc_no: 'CHK-1', pdc_date: '2026-12-01', amount: '100' };
    expect(
      detectCrossPayableSharedPdc([
        { pdc_group: null, pdc_lines: [{ ...shared }] },
        { pdc_group: null, pdc_lines: [{ ...shared, amount: '200' }] },
      ]),
    ).toEqual({ pdc_no: 'CHK-1', pdc_date: '2026-12-01' });
  });

  it('returns null for mode A (multi-line or different checks)', () => {
    expect(
      detectCrossPayableSharedPdc([
        {
          pdc_lines: [
            { pdc_no: 'A', pdc_date: '2026-01-01', amount: '50' },
            { pdc_no: 'B', pdc_date: '2026-01-02', amount: '50' },
          ],
        },
        { pdc_lines: [{ pdc_no: 'C', pdc_date: '2026-01-03', amount: '100' }] },
      ]),
    ).toBeNull();
  });
});

describe('assertSharedBatchPutAllowed', () => {
  it('rejects unlink and multi-line schedules', () => {
    expect(() => assertSharedBatchPutAllowed(9, { shared_pdc_batch: null })).toThrow(/cannot be unlinked/);
    expect(() =>
      assertSharedBatchPutAllowed(9, {
        invoices: [{ pdc_lines: [{ amount: '50' }, { amount: '50' }] }],
      }),
    ).toThrow(/single PDC line/);
    expect(() =>
      assertSharedBatchPutAllowed(9, {
        invoices: [{ pdc_group: 'g1' }],
      }),
    ).toThrow(/pdc_group/);
  });
});