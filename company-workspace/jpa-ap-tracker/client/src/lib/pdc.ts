import type { PayablePdcGroup, PayablePdcLine } from '../api';
import { formatAmountPlain, formatMoney } from '../format';

export interface PdcLineDraft {
  key: string;
  pdc_no: string;
  pdc_date: string;
  amount: string;
}

export interface PdcLinePayload {
  pdc_no: string | null;
  pdc_date: string | null;
  amount: string;
}

/** Check no. and date of a shared PDC; its amount is always the sum of its invoices' nets. */
export interface SharedPdcDraft {
  pdc_no: string;
  pdc_date: string;
}

/** Shared PDCs by key. Stored ones use the key from the API; new ones use `newSharedPdcKey()`. */
export type SharedPdcDrafts = Record<string, SharedPdcDraft>;

export interface SharedPdcPayload {
  key: string;
  pdc_no: string | null;
  pdc_date: string | null;
}

/** One invoice's PDC in a request: its own lines, or the key of the shared PDC that pays it. */
export type InvoicePdcPayload = { pdc_group: string } | { pdc_group: null; pdc_lines: PdcLinePayload[] };

/** PDC part of a status change: coverage per stored invoice id, plus the shared PDCs they name. */
export interface PdcStatusPayload {
  invoices: ({ id: number } & InvoicePdcPayload)[];
  pdc_groups: SharedPdcPayload[];
}

/** An invoice draft as far as PDC goes. `pdc_lines` stay in state while shared, so leaving restores them. */
export interface PdcInvoiceDraft {
  key: string;
  pdc_lines: PdcLineDraft[];
  pdc_group: string | null;
}

export function isPdcPaymentMethodName(name: string | null | undefined): boolean {
  const n = (name ?? '').toLowerCase();
  return n.includes('post dated') || n.includes('pdc');
}

const randomKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function newPdcLine(partial?: Partial<PdcLineDraft>): PdcLineDraft {
  return {
    key: randomKey(),
    pdc_no: '',
    pdc_date: '',
    amount: '',
    ...partial,
  };
}

export function newSharedPdcKey(): string {
  return `new-${randomKey()}`;
}

export function pdcLinesFromApi(lines: PayablePdcLine[] | undefined): PdcLineDraft[] {
  return (lines ?? []).map((line) => ({
    key: `pdc-${line.id}`,
    pdc_no: line.pdc_no ?? '',
    pdc_date: line.pdc_date ?? '',
    amount: formatAmountPlain(line.amount),
  }));
}

export function sharedPdcsFromApi(groups: PayablePdcGroup[] | undefined): SharedPdcDrafts {
  return Object.fromEntries((groups ?? []).map((g) => [g.key, { pdc_no: g.pdc_no ?? '', pdc_date: g.pdc_date ?? '' }]));
}

/** Drops rows without a positive amount (blank rows the user never filled). */
export function pdcLinesPayload(lines: PdcLineDraft[]): PdcLinePayload[] {
  return lines
    .map((line) => ({
      pdc_no: line.pdc_no.trim() || null,
      pdc_date: line.pdc_date || null,
      amount: line.amount.replace(/,/g, '').trim(),
    }))
    .filter((line) => Number(line.amount) > 0);
}

export function invoicePdcPayload(inv: Pick<PdcInvoiceDraft, 'pdc_lines' | 'pdc_group'>): InvoicePdcPayload {
  return inv.pdc_group ? { pdc_group: inv.pdc_group } : { pdc_group: null, pdc_lines: pdcLinesPayload(inv.pdc_lines) };
}

/** The shared PDCs some invoice still points at. */
export function sharedPdcsPayload(invoices: Pick<PdcInvoiceDraft, 'pdc_group'>[], drafts: SharedPdcDrafts): SharedPdcPayload[] {
  const keys = [...new Set(invoices.flatMap((inv) => (inv.pdc_group ? [inv.pdc_group] : [])))];
  return keys.map((key) => ({ key, pdc_no: drafts[key]?.pdc_no.trim() || null, pdc_date: drafts[key]?.pdc_date || null }));
}

/**
 * Ends every shared PDC with fewer than two invoices. Its last invoice gets the check as its own single
 * PDC line for its full net, which is how the server stores it.
 */
export function endLoneSharedPdcs<T extends PdcInvoiceDraft>(
  invoices: T[],
  drafts: SharedPdcDrafts,
  netByKey: ReadonlyMap<string, number>,
): T[] {
  const counts = new Map<string, number>();
  for (const inv of invoices) if (inv.pdc_group) counts.set(inv.pdc_group, (counts.get(inv.pdc_group) ?? 0) + 1);
  return invoices.map((inv) => {
    if (!inv.pdc_group || (counts.get(inv.pdc_group) ?? 0) > 1) return inv;
    const check = drafts[inv.pdc_group];
    const line = newPdcLine({
      pdc_no: check?.pdc_no ?? '',
      pdc_date: check?.pdc_date ?? '',
      amount: formatAmountPlain(netByKey.get(inv.key) ?? 0),
    });
    return { ...inv, pdc_group: null, pdc_lines: [line] };
  });
}

/** Puts exactly the invoices in `members` on shared PDC `group`; invoices it loses go back to their own schedule. */
export function setSharedPdcMembers<T extends PdcInvoiceDraft>(
  invoices: T[],
  group: string,
  members: ReadonlySet<string>,
  drafts: SharedPdcDrafts,
  netByKey: ReadonlyMap<string, number>,
): T[] {
  const next = invoices.map((inv) =>
    members.has(inv.key) ? { ...inv, pdc_group: group } : inv.pdc_group === group ? { ...inv, pdc_group: null } : inv,
  );
  return endLoneSharedPdcs(next, drafts, netByKey);
}

export function sumPdcAmounts(lines: PdcLineDraft[]): number {
  return lines.reduce((acc, line) => {
    const n = Number(String(line.amount).replace(/,/g, ''));
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/** ±₱0.01, compared in centavos so float noise cannot reject a one-centavo gap. */
export function isPdcBalanced(lines: PdcLineDraft[], net: number): boolean {
  return Math.abs(Math.round(sumPdcAmounts(lines) * 100) - Math.round(net * 100)) <= 1;
}

/** Create + separate payable per invoice: own schedule per payable vs one check stamped on each payable. */
export type SeparateBatchPdcMode = 'per-invoice' | 'one-for-all';

export interface BatchSharedPdcDraft {
  pdc_no: string;
  pdc_date: string;
}

/** One check shared across batch payables: each payable gets one line for its net with this no./date. */
export function batchOnePdcLinePayload(check: BatchSharedPdcDraft, netAmount: number): PdcLinePayload {
  return {
    pdc_no: check.pdc_no.trim() || null,
    pdc_date: check.pdc_date || null,
    amount: formatAmountPlain(netAmount).replace(/,/g, ''),
  };
}

export function invoicePdcForSeparateBatchCreate(
  inv: PdcInvoiceDraft,
  mode: SeparateBatchPdcMode,
  check: BatchSharedPdcDraft,
  netAmount: number,
): InvoicePdcPayload {
  if (mode === 'one-for-all') return { pdc_group: null, pdc_lines: [batchOnePdcLinePayload(check, netAmount)] };
  return invoicePdcPayload(inv);
}

export function onePdcForAllBatchProblem(check: BatchSharedPdcDraft): string | null {
  if (!check.pdc_no.trim()) return 'Enter the PDC check number for all invoices';
  if (!check.pdc_date) return 'Enter the PDC date for all invoices';
  return null;
}

/** Why an invoice's own PDC schedule cannot be submitted, or null when it can. */
export function pdcScheduleProblem(lines: PdcLineDraft[], net: number): string | null {
  if (!pdcLinesPayload(lines).length) return 'add at least one PDC line or share a PDC';
  if (!isPdcBalanced(lines, net)) {
    return `PDC total ${formatMoney(sumPdcAmounts(lines))} must equal the invoice net ${formatMoney(net)}`;
  }
  return null;
}
