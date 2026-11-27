import { describe, expect, it } from 'vitest';
import {
  batchOnePdcLinePayload,
  endLoneSharedPdcs,
  invoicePdcForSeparateBatchCreate,
  invoicePdcPayload,
  newPdcLine,
  onePdcForAllBatchProblem,
  setSharedPdcMembers,
  sharedPdcsPayload,
  type PdcInvoiceDraft,
  type SharedPdcDrafts,
} from './pdc';

const invoice = (key: string, pdc_group: string | null = null, amounts: string[] = []): PdcInvoiceDraft => ({
  key,
  pdc_group,
  pdc_lines: amounts.map((amount) => newPdcLine({ amount })),
});
const nets = new Map([
  ['a', 1000],
  ['b', 250.5],
  ['c', 749.5],
]);
const drafts: SharedPdcDrafts = { g1: { pdc_no: 'CHK-9', pdc_date: '2026-12-01' }, g2: { pdc_no: '', pdc_date: '' } };
const groups = (rows: PdcInvoiceDraft[]) => rows.map((r) => r.pdc_group);

describe('setSharedPdcMembers', () => {
  it('puts the chosen invoices on the shared PDC and keeps their own lines aside', () => {
    const rows = setSharedPdcMembers([invoice('a', null, ['1000']), invoice('b'), invoice('c')], 'g1', new Set(['b', 'c']), drafts, nets);
    expect(groups(rows)).toEqual([null, 'g1', 'g1']);
    expect(rows[0]!.pdc_lines.map((l) => l.amount)).toEqual(['1000']);
  });

  it('restores an invoice\'s own lines when it leaves a shared PDC that keeps two invoices', () => {
    const rows = setSharedPdcMembers(
      [invoice('a', 'g1', ['400', '600']), invoice('b', 'g1'), invoice('c', 'g1')],
      'g1',
      new Set(['b', 'c']),
      drafts,
      nets,
    );
    expect(groups(rows)).toEqual([null, 'g1', 'g1']);
    expect(rows[0]!.pdc_lines.map((l) => l.amount)).toEqual(['400', '600']);
  });

  it('turns the last invoice on a shared PDC into its own single check for its net', () => {
    const rows = setSharedPdcMembers([invoice('a'), invoice('b', 'g1'), invoice('c', 'g1')], 'g1', new Set(['c']), drafts, nets);
    expect(groups(rows)).toEqual([null, null, null]);
    expect(rows[2]!.pdc_lines).toMatchObject([{ pdc_no: 'CHK-9', pdc_date: '2026-12-01', amount: '749.50' }]);
  });

  it('moving an invoice to another shared PDC ends the one it leaves alone', () => {
    const rows = setSharedPdcMembers([invoice('a', 'g1'), invoice('b', 'g1'), invoice('c')], 'g2', new Set(['b', 'c']), drafts, nets);
    expect(groups(rows)).toEqual([null, 'g2', 'g2']);
    expect(rows[0]!.pdc_lines).toMatchObject([{ pdc_no: 'CHK-9', amount: '1,000.00' }]);
  });
});

describe('endLoneSharedPdcs', () => {
  it('ends a shared PDC whose other invoice row was removed', () => {
    expect(groups(endLoneSharedPdcs([invoice('a'), invoice('c', 'g1')], drafts, nets))).toEqual([null, null]);
  });
});

describe('separate batch create PDC', () => {
  const check = { pdc_no: 'CHK-BATCH', pdc_date: '2026-12-15' };

  it('mode one-for-all stamps each invoice net on one shared check', () => {
    expect(invoicePdcForSeparateBatchCreate(invoice('a', null, ['ignored']), 'one-for-all', check, 333.33)).toEqual({
      pdc_group: null,
      pdc_lines: [{ pdc_no: 'CHK-BATCH', pdc_date: '2026-12-15', amount: '333.33' }],
    });
    expect(batchOnePdcLinePayload(check, 1000)).toEqual({
      pdc_no: 'CHK-BATCH',
      pdc_date: '2026-12-15',
      amount: '1000.00',
    });
  });

  it('mode per-invoice keeps the invoice schedule payload', () => {
    expect(invoicePdcForSeparateBatchCreate(invoice('a', null, ['500', '']), 'per-invoice', check, 1000)).toEqual({
      pdc_group: null,
      pdc_lines: [{ pdc_no: null, pdc_date: null, amount: '500' }],
    });
  });

  it('validates the shared check header', () => {
    expect(onePdcForAllBatchProblem({ pdc_no: '', pdc_date: '2026-01-01' })).toContain('check number');
    expect(onePdcForAllBatchProblem(check)).toBeNull();
  });
});

describe('PDC payloads', () => {
  it('sends a shared invoice\'s key and no lines, and an own invoice\'s lines with pdc_group null', () => {
    expect(invoicePdcPayload(invoice('b', 'g1', ['5']))).toEqual({ pdc_group: 'g1' });
    expect(invoicePdcPayload(invoice('a', null, ['1,000.00', '']))).toEqual({
      pdc_group: null,
      pdc_lines: [{ pdc_no: null, pdc_date: null, amount: '1000.00' }],
    });
  });

  it('sends only the shared PDCs some invoice still names', () => {
    expect(sharedPdcsPayload([invoice('a'), invoice('b', 'g1'), invoice('c', 'g1')], drafts)).toEqual([
      { key: 'g1', pdc_no: 'CHK-9', pdc_date: '2026-12-01' },
    ]);
  });
});
