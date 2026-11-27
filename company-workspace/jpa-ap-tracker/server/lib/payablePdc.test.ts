import { describe, expect, it } from 'vitest';
import { isPdcPaymentMethodName } from './payablePdc';

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