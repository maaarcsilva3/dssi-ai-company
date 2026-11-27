import { describe, expect, it } from 'vitest';
import { computeTaxAmounts, moneyString } from './tax';

describe('computeTaxAmounts (VAT-inclusive)', () => {
  it('matches the computation sample: amount paid is gross minus EWT', () => {
    // Gross 18000 → VAT 1928.57 → net sales 16071.43 → EWT 321.43 → paid 17678.57
    const r = computeTaxAmounts(18000, { applyVat: true, vatRate: 12, applyEwt: true, ewtRate: 2 });
    expect(moneyString(r.vatAmount)).toBe('1928.57');
    expect(moneyString(r.netOfVat)).toBe('16071.43');
    expect(moneyString(r.ewtAmount)).toBe('321.43');
    expect(moneyString(r.netAmount)).toBe('17678.57');
  });

  it('extracts 12% VAT and 2% EWT, then pays gross minus EWT', () => {
    // Gross 1120 → VAT 120 → net sales 1000 → EWT 20 → paid 1100
    const r = computeTaxAmounts(1120, { applyVat: true, vatRate: 12, applyEwt: true, ewtRate: 2 });
    expect(moneyString(r.vatAmount)).toBe('120.00');
    expect(moneyString(r.netOfVat)).toBe('1000.00');
    expect(moneyString(r.ewtAmount)).toBe('20.00');
    expect(moneyString(r.netAmount)).toBe('1100.00');
  });

  it('applies 1% EWT for products without VAT', () => {
    const r = computeTaxAmounts(1000, { applyVat: false, applyEwt: true, ewtRate: 1 });
    expect(moneyString(r.vatAmount)).toBe('0.00');
    expect(moneyString(r.ewtAmount)).toBe('10.00');
    expect(moneyString(r.netAmount)).toBe('990.00');
  });

  it('passes gross through when taxes are off', () => {
    const r = computeTaxAmounts(250.5, { applyVat: false, applyEwt: false });
    expect(moneyString(r.netAmount)).toBe('250.50');
  });
});
