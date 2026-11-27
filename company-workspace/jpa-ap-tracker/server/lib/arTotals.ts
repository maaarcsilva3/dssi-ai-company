/** Money helpers for logistics AR billing (VAT 12%, EWT 2% of VATex). */

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function moneyString(n: number): string {
  return roundMoney(n).toFixed(2);
}

/** Detail line amounts are VAT-inclusive (matches SI Total Sales VAT Inclusive). */
export function computeArTotals(vatInc: number, deductionsTotal = 0) {
  const totalSalesVatinc = roundMoney(vatInc);
  const totalSalesVatex = roundMoney(totalSalesVatinc / 1.12);
  const vatAmount = roundMoney(totalSalesVatinc - totalSalesVatex);
  const ewtAmount = roundMoney(totalSalesVatex * 0.02);
  const totalAfterEwt = roundMoney(totalSalesVatinc - ewtAmount);
  const deductions = roundMoney(deductionsTotal);
  const grandTotal = roundMoney(totalAfterEwt - deductions);
  return {
    total_sales_vatex: moneyString(totalSalesVatex),
    vat_amount: moneyString(vatAmount),
    total_sales_vatinc: moneyString(totalSalesVatinc),
    ewt_amount: moneyString(ewtAmount),
    total_after_ewt: moneyString(totalAfterEwt),
    deductions_total: moneyString(deductions),
    grand_total: moneyString(grandTotal),
  };
}
