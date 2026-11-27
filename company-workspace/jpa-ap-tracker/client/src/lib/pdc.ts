export interface PdcLineDraft {
  key: string;
  pdc_no: string;
  pdc_date: string;
  amount: string;
}

export function isPdcPaymentMethodName(name: string | null | undefined): boolean {
  const n = (name ?? '').toLowerCase();
  return n.includes('post dated') || n.includes('pdc');
}

export function newPdcLine(partial?: Partial<PdcLineDraft>): PdcLineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pdc_no: '',
    pdc_date: '',
    amount: '',
    ...partial,
  };
}

export function sumPdcAmounts(lines: PdcLineDraft[]): number {
  return lines.reduce((acc, line) => {
    const n = Number(String(line.amount).replace(/,/g, ''));
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}