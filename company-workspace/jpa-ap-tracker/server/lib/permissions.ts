export const PERMISSION_KEYS = [
  'payables_view',
  'payables_create',
  'payables_edit',
  'payables_delete',
  'payables_status',
  'payables_status_history',
  'upcoming_release',
  'suppliers',
  'receivables_view',
  'receivables_create',
  'receivables_edit',
  'receivables_delete',
  'receivables_status',
  'upcoming_collection',
  'masterdata',
  'settings',
  'source_accounts',
  'liquidations_view',
  'liquidations_manage',
  'petty_cash_view',
  'petty_cash_manage',
  'ar_view',
  'ar_edit',
  'ar_clients_manage',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type UserRole = 'admin' | 'staff';

export type Permissions = Record<PermissionKey, boolean>;

export const EMPTY_PERMISSIONS: Permissions = {
  payables_view: false,
  payables_create: false,
  payables_edit: false,
  payables_delete: false,
  payables_status: false,
  payables_status_history: false,
  upcoming_release: false,
  suppliers: false,
  receivables_view: false,
  receivables_create: false,
  receivables_edit: false,
  receivables_delete: false,
  receivables_status: false,
  upcoming_collection: false,
  masterdata: false,
  settings: false,
  source_accounts: false,
  liquidations_view: false,
  liquidations_manage: false,
  petty_cash_view: false,
  petty_cash_manage: false,
  ar_view: false,
  ar_edit: false,
  ar_clients_manage: false,
};

/** Admin effective permissions: everything allowed. */
export const ALL_PERMISSIONS: Permissions = {
  payables_view: true,
  payables_create: true,
  payables_edit: true,
  payables_delete: true,
  payables_status: true,
  payables_status_history: true,
  upcoming_release: true,
  suppliers: true,
  receivables_view: true,
  receivables_create: true,
  receivables_edit: true,
  receivables_delete: true,
  receivables_status: true,
  upcoming_collection: true,
  masterdata: true,
  settings: true,
  source_accounts: true,
  liquidations_view: true,
  liquidations_manage: true,
  petty_cash_view: true,
  petty_cash_manage: true,
  ar_view: true,
  ar_edit: true,
  ar_clients_manage: true,
};

export function permissionsFromRow(row: Partial<Permissions> | null | undefined): Permissions {
  if (!row) return { ...EMPTY_PERMISSIONS };
  const out = { ...EMPTY_PERMISSIONS };
  for (const key of PERMISSION_KEYS) {
    out[key] = Boolean(row[key]);
  }
  return out;
}
