/** Round half-up to 2 decimal places (PHP money). */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function moneyString(n: number): string {
  return roundMoney(n).toFixed(2);
}

export type EwtKind = 'products' | 'service';

export const DEFAULT_VAT_RATE = 12;
export const EWT_RATES: Record<EwtKind, number> = { products: 1, service: 2 };

/**
 * PH VAT-inclusive, matching the computation sample:
 * VAT = (gross / (1 + rate)) * rate, total net sales = gross − VAT,
 * EWT = total net sales * rate, amount paid = gross − EWT.
 * VAT is the EWT base only; it is not deducted again from the amount paid.
 */
export function computeTaxAmounts(
  gross: number,
  opts: {
    applyVat: boolean;
    vatRate?: number;
    applyEwt: boolean;
    ewtRate?: number;
  },
): { vatAmount: number; ewtAmount: number; netAmount: number; netOfVat: number } {
  const vatRate = opts.vatRate ?? DEFAULT_VAT_RATE;
  const vatAmount = opts.applyVat ? roundMoney((gross * vatRate) / (100 + vatRate)) : 0;
  const netOfVat = roundMoney(gross - vatAmount);
  const ewtRate = opts.ewtRate ?? 0;
  const ewtAmount = opts.applyEwt ? roundMoney((netOfVat * ewtRate) / 100) : 0;
  const netAmount = roundMoney(gross - ewtAmount);
  return { vatAmount, ewtAmount, netAmount, netOfVat };
}

export function ewtRateFor(kind: EwtKind | null | undefined, applyEwt: boolean): number | null {
  if (!applyEwt || !kind) return applyEwt ? null : null;
  return EWT_RATES[kind];
}
