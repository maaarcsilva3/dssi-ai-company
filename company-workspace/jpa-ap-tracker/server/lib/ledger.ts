import type { PermissionKey } from './permissions';

/** Table and column names are code constants. Never take them from a request. */
export interface LedgerSpec {
  kind: 'payable' | 'receivable';
  document: 'payables' | 'receivables';
  party: 'clients' | 'customers';
  statuses: 'payable_statuses' | 'receivable_statuses';
  invoices: 'payable_invoices' | 'receivable_invoices';
  history: 'payable_status_history' | 'receivable_status_history';
  parentFk: 'payable_id' | 'receivable_id';
  noun: 'Payable' | 'Receivable';
  unknownParty: string;
  fuel: boolean;
  /** Status name that reserves cash (withdrawal for payables, deposit for receivables). */
  reserveName: 'create check for deposit' | 'expected';
  reserveError: string;
  cash: 'withdraw' | 'deposit';
  perms: {
    view: PermissionKey;
    create: PermissionKey;
    edit: PermissionKey;
    delete: PermissionKey;
    status: PermissionKey;
    window: PermissionKey;
  };
}

export const PAYABLE_LEDGER: LedgerSpec = {
  kind: 'payable',
  document: 'payables',
  party: 'clients',
  statuses: 'payable_statuses',
  invoices: 'payable_invoices',
  history: 'payable_status_history',
  parentFk: 'payable_id',
  noun: 'Payable',
  unknownParty: 'Unknown supplier',
  fuel: true,
  reserveName: 'create check for deposit',
  reserveError: 'Select a source account when creating a check for deposit',
  cash: 'withdraw',
  perms: {
    view: 'payables_view',
    create: 'payables_create',
    edit: 'payables_edit',
    delete: 'payables_delete',
    status: 'payables_status',
    window: 'upcoming_release',
  },
};

export const RECEIVABLE_LEDGER: LedgerSpec = {
  kind: 'receivable',
  document: 'receivables',
  party: 'customers',
  statuses: 'receivable_statuses',
  invoices: 'receivable_invoices',
  history: 'receivable_status_history',
  parentFk: 'receivable_id',
  noun: 'Receivable',
  unknownParty: 'Unknown customer',
  fuel: false,
  reserveName: 'expected',
  reserveError: 'Select a source account when marking expected',
  cash: 'deposit',
  perms: {
    view: 'receivables_view',
    create: 'receivables_create',
    edit: 'receivables_edit',
    delete: 'receivables_delete',
    status: 'receivables_status',
    window: 'upcoming_collection',
  },
};

export function isReserveStatus(name: string, reserveName: string): boolean {
  return name.trim().toLowerCase() === reserveName;
}

export function fundRemark(spec: LedgerSpec, invoiceNo: string | null, id: number): string {
  const no = invoiceNo?.trim();
  if (spec.cash === 'deposit') {
    return no ? `Collection of invoice ${no}` : `Collection of receivable #${id}`;
  }
  return no ? `Payment to invoice ${no}` : `Payment to payable #${id}`;
}
