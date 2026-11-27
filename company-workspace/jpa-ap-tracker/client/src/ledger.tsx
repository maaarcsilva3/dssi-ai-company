import { createContext, useContext, type ReactNode } from 'react';
import type { PermissionKey, StatusCategory } from './api';

export interface LedgerUi {
  kind: 'payable' | 'receivable';
  apiBase: '/payables' | '/receivables';
  windowBase: '/releases' | '/collections';
  listPath: '/payables' | '/receivables';
  partyEndpoint: '/clients' | '/customers';
  statusEndpoint: '/statuses' | '/receivable-statuses';
  title: string;
  newLabel: string;
  doc: string;
  docs: string;
  party: string;
  partyLower: string;
  fuel: boolean;
  reserveName: string;
  categoryLabels: Record<StatusCategory, string>;
  perms: {
    view: PermissionKey;
    create: PermissionKey;
    edit: PermissionKey;
    delete: PermissionKey;
    status: PermissionKey;
  };
  reserveHint: string;
  reserveSaveHint: string;
  reserveMissing: string;
  reserveBulkMissing: string;
  paidOnLabel: string;
  netHint: string;
  assigneeHint: string;
  windowTitle: string;
  stillLabel: string;
  alreadyLabel: string;
  toVerb: string;
  doneWord: string;
  showDone: string;
  byParty: string;
  openColumn: string;
  doneColumn: string;
  scheduleDayLabel: string;
  dateColumn: string;
  emptyList: string;
  searchPlaceholder: string;
  noParties: string;
  newTitle: string;
  termsHint: string;
  noDefaultTerm: string;
  oneDocChoice: string;
  severalDocsChoice: string;
  createLabel: string;
  uploadHint: string;
  savedUpload: (id: number) => string;
}

export const payableLedger: LedgerUi = {
  kind: 'payable',
  apiBase: '/payables',
  windowBase: '/releases',
  listPath: '/payables',
  partyEndpoint: '/clients',
  statusEndpoint: '/statuses',
  title: 'Payables',
  newLabel: '+ New payable',
  doc: 'payable',
  docs: 'payables',
  party: 'Supplier',
  partyLower: 'supplier',
  fuel: true,
  // Must match server PAYABLE_LEDGER.reserveName (case-insensitive compare).
  reserveName: 'create check for deposit',
  categoryLabels: {
    open: 'Open (to be released)',
    paid: 'Paid / released',
    cancelled: 'Cancelled',
  },
  perms: {
    view: 'payables_view',
    create: 'payables_create',
    edit: 'payables_edit',
    delete: 'payables_delete',
    status: 'payables_status',
  },
  reserveHint: 'A pending withdrawal will be posted against this account.',
  reserveSaveHint: 'A pending withdrawal will be posted when saving as Create check for deposit.',
  reserveMissing: 'Select a source account when creating a check for deposit',
  reserveBulkMissing: 'Select a source account when setting status to Create check for deposit.',
  paidOnLabel: 'Paid on',
  netHint: 'Total net (amount paid) = gross − EWT.',
  assigneeHint: 'Staff only see payables assigned to them',
  windowTitle: 'Upcoming Release',
  stillLabel: 'Still to release',
  alreadyLabel: 'Already paid',
  toVerb: 'to release',
  doneWord: 'paid',
  showDone: 'Show paid',
  byParty: 'By supplier',
  openColumn: 'To release',
  doneColumn: 'Paid',
  scheduleDayLabel: 'Default release day',
  dateColumn: 'Release date',
  emptyList: 'No payables match the filters.',
  searchPlaceholder: 'Invoice no, supplier, description',
  noParties: 'No suppliers yet — add them in',
  newTitle: 'New payable',
  termsHint: "Payment terms default to the supplier's masterdata term on each invoice; you can override per invoice below.",
  noDefaultTerm: 'This supplier has no default — pick a term or enter due dates manually. Manage defaults in',
  oneDocChoice: 'One payable with multiple invoice lines',
  severalDocsChoice: 'Several separate payable rows (one per invoice)',
  createLabel: 'Create payable',
  uploadHint: 'Upload a file on each invoice box above — each payable gets its own attachment(s).',
  savedUpload: (id) => `Payable saved (#${id}) but upload failed`,
};

export const receivableLedger: LedgerUi = {
  kind: 'receivable',
  apiBase: '/receivables',
  windowBase: '/collections',
  listPath: '/receivables',
  partyEndpoint: '/customers',
  statusEndpoint: '/receivable-statuses',
  title: 'Receivables',
  newLabel: '+ New receivable',
  doc: 'receivable',
  docs: 'receivables',
  party: 'Customer',
  partyLower: 'customer',
  fuel: false,
  reserveName: 'expected',
  categoryLabels: {
    open: 'Outstanding (to be collected)',
    paid: 'Collected',
    cancelled: 'Cancelled',
  },
  perms: {
    view: 'receivables_view',
    create: 'receivables_create',
    edit: 'receivables_edit',
    delete: 'receivables_delete',
    status: 'receivables_status',
  },
  reserveHint: 'A pending deposit will be posted against this account.',
  reserveSaveHint: 'A pending deposit will be posted when saving as Expected.',
  reserveMissing: 'Select a source account to receive the deposit.',
  reserveBulkMissing: 'Select a source account when setting status to Expected.',
  paidOnLabel: 'Collected on',
  netHint: 'Total net (amount collected) = gross − EWT.',
  assigneeHint: 'Staff only see receivables assigned to them',
  windowTitle: 'Upcoming Collection',
  stillLabel: 'Still to collect',
  alreadyLabel: 'Already collected',
  toVerb: 'to collect',
  doneWord: 'collected',
  showDone: 'Show collected',
  byParty: 'By customer',
  openColumn: 'To collect',
  doneColumn: 'Collected',
  scheduleDayLabel: 'Default collection day',
  dateColumn: 'Collection date',
  emptyList: 'No receivables match the filters.',
  searchPlaceholder: 'Invoice no, customer, description',
  noParties: 'No customers yet — add them in',
  newTitle: 'New receivable',
  termsHint: "Payment terms default to the customer's masterdata term on each invoice; you can override per invoice below.",
  noDefaultTerm: 'This customer has no default — pick a term or enter due dates manually. Manage defaults in',
  oneDocChoice: 'One receivable with multiple invoice lines',
  severalDocsChoice: 'Several separate receivable rows (one per invoice)',
  createLabel: 'Create receivable',
  uploadHint: 'Upload a file on each invoice box above — each receivable gets its own attachment(s).',
  savedUpload: (id) => `Receivable saved (#${id}) but upload failed`,
};

const LedgerContext = createContext<LedgerUi>(payableLedger);

export function LedgerProvider({ ledger, children }: { ledger: LedgerUi; children: ReactNode }) {
  return <LedgerContext.Provider value={ledger}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  return useContext(LedgerContext);
}

export function isReserveStatus(name: string, reserveName: string) {
  return name.trim().toLowerCase() === reserveName;
}
