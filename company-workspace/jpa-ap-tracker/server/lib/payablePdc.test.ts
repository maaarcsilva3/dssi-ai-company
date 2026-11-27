import { describe, expect, it } from 'vitest';
import {
  isPdcPaymentMethodName,
  parsePdcLineAmount,
  pdcCoverageErrors,
  planPdc,
  resolveInvoicePdc,
  type InvoicePdc,
} from './payablePdc';

const own = (...amounts: string[]): InvoicePdc => ({ kind: 'own', lines: amounts.map((amount) => ({ amount })) });
const shared = (group: string): InvoicePdc => ({ kind: 'shared', group });
const inv = (invoice_no: string | null, net_amount: string) => ({ invoice_no, net_amount });

describe('isPdcPaymentMethodName', () => {
  it('matches Post Dated Check', () => {
    expect(isPdcPaymentMethodName('Post Dated Check')).toBe(true);
  });
  it('matches PDC abbreviation', () => {
    expect(isPdcPaymentMethodName('Supplier PDC')).toBe(true);
  });
  it('rejects non-PDC methods', () => {
    expect(isPdcPaymentMethodName('Check')).toBe(false);
  });
});

describe('parsePdcLineAmount', () => {
  it('strips thousands separators', () => {
    expect(parsePdcLineAmount('1,234.56')).toBe(1234.56);
  });
  it('accepts plain numbers', () => {
    expect(parsePdcLineAmount('500')).toBe(500);
  });
});

describe('pdcCoverageErrors', () => {
  it('accepts each invoice balanced against its own net, with comma amounts', () => {
    expect(
      pdcCoverageErrors([inv('A-1', '49107.14'), inv('A-2', '1000.00')], [own('24,553.57', '24,553.57'), own('1,000.00')]),
    ).toEqual({});
  });

  it('rejects an invoice that only balances against the payable total', () => {
    const errors = pdcCoverageErrors([inv('A-1', '600.00'), inv('A-2', '400.00')], [own('1,000.00'), own('0.01')]);
    expect(Object.keys(errors).sort()).toEqual(['invoices.0.pdc_lines', 'invoices.1.pdc_lines']);
    expect(errors['invoices.0.pdc_lines']![0]).toContain('1000.00');
    expect(errors['invoices.0.pdc_lines']![0]).toContain('600.00');
  });

  it('tolerates a one-centavo rounding gap', () => {
    expect(pdcCoverageErrors([inv(null, '100.00')], [own('33.33', '66.66')])).toEqual({});
  });

  it('requires a line or a shared PDC on every invoice', () => {
    expect(pdcCoverageErrors([inv('A-1', '100.00'), inv('A-2', '50.00')], [own('100'), own()])).toEqual({
      'invoices.1.pdc_lines': ['Invoice 2 (A-2): add at least one PDC line or share a PDC'],
    });
  });

  it('accepts invoices on a shared PDC beside an invoice with its own schedule', () => {
    expect(
      pdcCoverageErrors([inv('A-1', '1000.00'), inv('A-2', '250.00'), inv('A-3', '750.00')], [
        own('400', '600'),
        shared('g'),
        shared('g'),
      ]),
    ).toEqual({});
  });

  it('requires an invoice to hang the schedule on', () => {
    expect(pdcCoverageErrors([], [])).toHaveProperty('invoices');
  });
});

describe('resolveInvoicePdc', () => {
  const storedOwn = own('500.00');
  const storedShared = shared('15');

  it('lets sent lines or a sent shared PDC replace what is stored', () => {
    expect(resolveInvoicePdc({ pdc_lines: [{ amount: '250' }] }, storedShared)).toEqual(own('250'));
    expect(resolveInvoicePdc({ pdc_group: 'new-1' }, storedOwn)).toEqual(shared('new-1'));
  });

  it('keeps either stored shape when the request sends neither', () => {
    expect(resolveInvoicePdc(undefined, storedOwn)).toBe(storedOwn);
    expect(resolveInvoicePdc({ pdc_lines: [] }, storedOwn)).toBe(storedOwn);
    expect(resolveInvoicePdc({ pdc_lines: [] }, storedShared)).toBe(storedShared);
  });

  it('leaves a shared PDC on pdc_group null, keeping only a stored own schedule', () => {
    expect(resolveInvoicePdc({ pdc_group: null, pdc_lines: [] }, storedShared)).toEqual(own());
    expect(resolveInvoicePdc({ pdc_group: null }, storedOwn)).toEqual(storedOwn);
  });

  it('is empty for a new invoice with nothing sent', () => {
    expect(resolveInvoicePdc(undefined, undefined)).toEqual(own());
  });
});

describe('planPdc', () => {
  const fields = new Map([
    ['g1', { pdc_no: 'CHK-9', pdc_date: '2026-12-01' }],
    ['g2', { pdc_no: ' CHK-10 ', pdc_date: null }],
  ]);
  const invoices = [inv('A', '1000.00'), inv('B', '250.50'), inv('C', '749.50'), inv('D', '80.00'), inv('E', '20.00')];

  it('puts each shared PDC on all its invoices', () => {
    const plan = planPdc(invoices, [own('1000'), shared('g1'), shared('g1'), shared('g2'), shared('g2')], fields);
    expect(plan.groups).toEqual([
      { key: 'g1', pdc_no: 'CHK-9', pdc_date: '2026-12-01', members: [1, 2] },
      { key: 'g2', pdc_no: 'CHK-10', pdc_date: null, members: [3, 4] },
    ]);
    expect(plan.coverage[0]).toEqual(own('1000'));
  });

  it('turns a shared PDC left with one invoice into that invoice\'s own check for its full net', () => {
    const plan = planPdc(invoices.slice(0, 2), [own('1000'), shared('g1')], fields);
    expect(plan.groups).toEqual([]);
    expect(plan.coverage[1]).toEqual({
      kind: 'own',
      lines: [{ pdc_no: 'CHK-9', pdc_date: '2026-12-01', amount: '250.50' }],
    });
  });

  it('rejects a key with no shared PDC fields', () => {
    expect(() => planPdc(invoices.slice(0, 2), [shared('ghost'), shared('ghost')], fields)).toThrow('Validation failed');
  });
});
