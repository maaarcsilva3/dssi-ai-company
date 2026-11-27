import { describe, expect, it } from 'vitest';
import {
  enrichProposedActionFromRows,
  enrichProposedActionFromText,
  normalizeProposedActionRaw,
  resolveSourceAccountIdFromText,
} from './aiPayableActions';

describe('normalizeProposedActionRaw', () => {
  it('moves invoice-like payableId into invoiceNo', () => {
    expect(normalizeProposedActionRaw({ kind: 'assign', payableId: 'INV-001' })).toEqual({
      kind: 'assign',
      invoiceNo: 'INV-001',
    });
  });

  it('parses numeric string payableId', () => {
    expect(normalizeProposedActionRaw({ kind: 'assign', payableId: '42' }).payableId).toBe(42);
  });
});

describe('enrichProposedActionFromRows', () => {
  const rows = [
    { id: 17, invoice_no: 'INV-001', status_name: 'For Review' },
    { id: 22, invoice_no: 'INV-002', status_name: 'For Review' },
  ];

  it('maps list ordinal payableId to the Nth result row', () => {
    expect(
      enrichProposedActionFromRows({ kind: 'change_status', payableId: 1, statusName: 'Create check for deposit' }, [
        rows,
      ]),
    ).toMatchObject({ payableId: 17, invoiceNo: 'INV-001' });
  });

  it('resolves payableId from invoiceNo in results', () => {
    expect(
      enrichProposedActionFromRows({ kind: 'assign', invoiceNo: 'INV-002', assigneeName: 'Ms. Crisa' }, [rows]),
    ).toMatchObject({ payableId: 22, invoiceNo: 'INV-002' });
  });

  it('uses the sole result row when ids are missing', () => {
    expect(
      enrichProposedActionFromRows({ kind: 'assign', assigneeName: 'Ms. Crisa' }, [
        [{ id: 17, invoice_no: 'INV-001' }],
      ]),
    ).toMatchObject({ payableId: 17, invoiceNo: 'INV-001' });
  });
});

describe('enrichProposedActionFromText', () => {
  it('picks a single invoice token from prior chat', () => {
    expect(
      enrichProposedActionFromText({ kind: 'assign', payableId: 1, assigneeName: 'Ms. Crisa' }, [
        'Upcoming releases:\n- INV-001 · ₱139,955.36 · For Review',
      ]),
    ).toMatchObject({ invoiceNo: 'INV-001', payableId: 1 });
  });
});

describe('resolveSourceAccountIdFromText', () => {
  const accounts = [
    { id: 1, bank_name: 'BDO', account_number: '123' },
    { id: 2, bank_name: 'BPI', account_number: '456' },
  ];

  it('resolves a bare id reply', () => {
    expect(resolveSourceAccountIdFromText(['Which account?', '2'], accounts)).toBe(2);
  });

  it('resolves by bank name', () => {
    expect(resolveSourceAccountIdFromText(['use BPI please'], accounts)).toBe(2);
  });

  it('resolves “account 1”', () => {
    expect(resolveSourceAccountIdFromText(['account 1'], accounts)).toBe(1);
  });
});
