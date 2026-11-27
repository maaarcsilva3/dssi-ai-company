export type StatusCategory = 'open' | 'paid' | 'cancelled';

export const CATEGORY_LABELS: Record<StatusCategory, string> = {
  open: 'Open (to be released)',
  paid: 'Paid / released',
  cancelled: 'Cancelled',
};

export type UserRole = 'admin' | 'staff';

export type PermissionKey =
  | 'payables_view'
  | 'payables_create'
  | 'payables_edit'
  | 'payables_delete'
  | 'payables_status'
  | 'payables_status_history'
  | 'upcoming_release'
  | 'suppliers'
  | 'receivables_view'
  | 'receivables_create'
  | 'receivables_edit'
  | 'receivables_delete'
  | 'receivables_status'
  | 'upcoming_collection'
  | 'masterdata'
  | 'settings'
  | 'source_accounts'
  | 'liquidations_view'
  | 'liquidations_manage'
  | 'petty_cash_view'
  | 'petty_cash_manage'
  | 'ar_view'
  | 'ar_edit'
  | 'ar_clients_manage';

export type Permissions = Record<PermissionKey, boolean>;

export type SourceTxnStatus = 'PENDING' | 'POSTED' | 'RESERVED' | 'CANCELLED' | 'REVERSED' | 'ON_HOLD';

export const SOURCE_TXN_STATUSES: SourceTxnStatus[] = [
  'PENDING',
  'POSTED',
  'RESERVED',
  'CANCELLED',
  'REVERSED',
  'ON_HOLD',
];

export interface SourceAccount {
  id: number;
  bank_name: string;
  account_number: string;
  active: boolean;
  available_balance?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SourceAccountTransaction {
  id: number;
  source_account_id: number;
  bank_name: string;
  account_number: string;
  deposit_amount: string;
  withdraw_amount: string;
  transaction_date: string;
  status: SourceTxnStatus;
  remarks: string | null;
  payable_id: number | null;
  receivable_id: number | null;
  transfer_group_id: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
}

export interface AuthUser {
  id: number;
  username: string;
  display_name: string;
  role: UserRole;
  active: boolean;
  permissions: Permissions;
  /** Staff: statuses they may change a payable into. Admins: empty (all allowed). */
  payable_status_ids?: number[];
  /** Staff: statuses that auto-assign this user when a payable enters them. */
  payable_default_status_ids?: number[];
}

export interface AppUser extends AuthUser {
  created_at?: string;
  updated_at?: string;
  payable_status_ids?: number[];
  payable_default_status_ids?: number[];
}

export interface AssigneeOption {
  id: number;
  username: string;
  display_name: string;
  /** Statuses that auto-assign this user when a payable enters them. */
  default_payable_status_ids?: number[];
}

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  payables_view: 'View payables',
  payables_create: 'Create payables',
  payables_edit: 'Edit payables',
  payables_delete: 'Delete payables',
  payables_status: 'Change payable status',
  payables_status_history: 'View payable status history',
  upcoming_release: 'Upcoming Release',
  suppliers: 'Manage suppliers',
  receivables_view: 'View receivables',
  receivables_create: 'Create receivables',
  receivables_edit: 'Edit receivables',
  receivables_delete: 'Delete receivables',
  receivables_status: 'Change receivable status',
  upcoming_collection: 'Upcoming Collection',
  masterdata: 'Masterdata',
  settings: 'Settings',
  source_accounts: 'Source accounts',
  liquidations_view: 'View liquidations',
  liquidations_manage: 'Manage liquidations',
  petty_cash_view: 'View petty cash / truck allowance',
  petty_cash_manage: 'Manage petty cash / truck allowance',
  ar_view: 'View accounts receivable (billing)',
  ar_edit: 'Edit accounts receivable (billing)',
  ar_clients_manage: 'Manage AR clients',
};

export interface PayableStatusCustomField {
  id: number;
  status_id?: number;
  label: string;
  field_type: 'text' | 'date';
  show_in_list: boolean;
  sort_order: number;
}

export interface PayableStatus {
  id: number;
  name: string;
  category: StatusCategory;
  color: string;
  sort_order: number;
  active: boolean;
  require_file?: boolean;
  custom_fields?: PayableStatusCustomField[];
}

export interface Client {
  id: number;
  name: string;
  tin: string | null;
  contact: string | null;
  address: string | null;
  bank_details: string | null;
  payment_term_id: number | null;
  active: boolean;
}

export interface PaymentType {
  id: number;
  name: string;
  active: boolean;
}

export interface PaymentMethod {
  id: number;
  name: string;
  requires_reference: boolean;
  active: boolean;
}

export interface PaymentTerm {
  id: number;
  name: string;
  days: number;
  active: boolean;
}

export interface Attachment {
  id: number;
  original_name: string;
  mime: string;
  size: number;
  created_at: string;
}

export type EwtKind = 'products' | 'service';

export interface PayableInvoice {
  id?: number;
  invoice_no: string | null;
  invoice_date: string | null;
  payment_term_id: number | null;
  due_date: string | null;
  gross_amount: string;
  vat_amount: string;
  ewt_amount: string;
  net_amount: string;
  sort_order: number;
}

export interface StatusHistoryEntry {
  id: number;
  payable_id: number;
  from_status_id: number | null;
  to_status_id: number;
  remarks: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  check_date: string | null;
  changed_by_name: string | null;
  created_at: string;
  from_status_name: string | null;
  from_status_color: string | null;
  from_status_category: StatusCategory | null;
  to_status_name: string;
  to_status_color: string;
  to_status_category: StatusCategory;
}

export interface Payable {
  id: number;
  client_id: number;
  payment_type_id: number;
  payment_method_id: number;
  payment_term_id: number | null;
  invoice_no: string | null;
  invoice_date: string | null;
  due_date: string;
  amount: string;
  gross_amount: string;
  apply_vat: boolean;
  vat_rate: string;
  vat_amount: string;
  apply_ewt: boolean;
  ewt_kind: EwtKind | null;
  ewt_rate: string | null;
  ewt_amount: string;
  description: string | null;
  status_id: number;
  status_name: string;
  status_category: StatusCategory;
  status_color: string;
  paid_at: string | null;
  check_date: string | null;
  is_draft: boolean;
  created_by: number | null;
  payment_reference: string | null;
  client_name: string;
  payment_type_name: string;
  payment_method_name: string;
  requires_reference: boolean;
  payment_term_name: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  source_account_id: number | null;
  source_account_bank_name: string | null;
  source_account_number: string | null;
  fuel_liters: string | null;
  fuel_price_per_liter: string | null;
  fuel_order_date: string | null;
  fuel_delivery_date: string | null;
  fuel_delivery_receipt: string | null;
  attachment_count: number;
  thumbnail_id: number | null;
  invoice_count: number;
  pdc_count?: number;
  pdc_lines?: {
    id?: number;
    pdc_no: string | null;
    pdc_date: string | null;
    amount: string;
    sort_order: number;
  }[];
  /** status_id → custom field value collected when entering that status */
  status_field_values?: Record<string, string>;
  attachments?: Attachment[];
  invoices?: PayableInvoice[];
}

export interface PayableList {
  items: Payable[];
  total: number;
  totalAmount: string;
  page: number;
  pageSize: number;
}

export interface Settings {
  release_weekday: number;
  days_before: number;
  days_after: number;
  include_overdue: boolean;
  timezone: string;
  /** Days after AR billing date used as default due date. */
  ar_due_days: number;
  today: string;
}

/** `count`/`amount` are still to be released; `paid_*` are already paid. */
export interface GroupTotal {
  id: number;
  name: string;
  count: number;
  amount: string;
  paid_count: number;
  paid_amount: string;
}

export interface UpcomingRelease {
  today: string;
  releaseDate: string;
  windowStart: string;
  windowEnd: string;
  daysBefore: number;
  daysAfter: number;
  includeOverdue: boolean;
  showPaid: boolean;
  releaseWeekday: number;
  items: (Payable & {
    /** This release date for open items, the paid date for paid items. */
    release_date: string;
    /** Days from release to due date; negative means released after the deadline. */
    days_before_due: number;
    carried_over: boolean;
    past_due: boolean;
  })[];
  totals: {
    overall: Omit<GroupTotal, 'id' | 'name'> & { carried_over_amount: string };
    byMethod: GroupTotal[];
    byClient: GroupTotal[];
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** e.g. '/dev/ap-tracker/' in production, '/' in development (Vite `base`). */
const BASE_URL = import.meta.env.BASE_URL;
const API_ROOT = `${BASE_URL}api`;

/** React Router basename: '/dev/ap-tracker' (no trailing slash), or '/' at the root. */
export const ROUTER_BASENAME = BASE_URL.replace(/\/+$/, '') || '/';

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`${API_ROOT}${url}`, {
    method,
    credentials: 'include',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/auth/')) {
      const base = ROUTER_BASENAME === '/' ? '' : ROUTER_BASENAME;
      if (!window.location.pathname.endsWith('/login')) {
        window.location.assign(`${base}/login`);
      }
    }
    throw new ApiError(res.status, data?.error ?? res.statusText, data?.details);
  }
  return data as T;
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  del: <T>(url: string) => request<T>('DELETE', url),
};

export const attachmentUrl = (id: number) => `${API_ROOT}/attachments/${id}`;

export const ar2307FileUrl = (summaryId: number) => `${API_ROOT}/ar/summaries/${summaryId}/2307/file`;

export type ReportPeriodKind = 'week' | 'month' | 'year';

export interface ReportNamedTotal {
  name: string;
  count: number;
  amount: string;
}

export interface ReportsPayload {
  period: {
    kind: ReportPeriodKind;
    anchor: string;
    start: string;
    end: string;
    label: string;
    today: string;
    timezone: string;
  };
  paid: {
    count: number;
    amount: string;
    gross_amount: string;
    vat_amount: string;
    ewt_amount: string;
    by_client: ReportNamedTotal[];
    by_type: ReportNamedTotal[];
    by_method: ReportNamedTotal[];
  };
  due: {
    count: number;
    amount: string;
    open_count: number;
    open_amount: string;
    paid_count: number;
    paid_amount: string;
    by_client: ReportNamedTotal[];
    by_type: ReportNamedTotal[];
    by_method: ReportNamedTotal[];
  };
  vat_ewt: {
    gross_amount: string;
    vat_amount: string;
    ewt_products: string;
    ewt_service: string;
    ewt_amount: string;
    net_amount: string;
  };
  aging: {
    as_of: string;
    total_count: number;
    total_amount: string;
    buckets: { bucket: string; label: string; count: number; amount: string }[];
  };
  assignees: {
    name: string;
    count: number;
    amount: string;
    open_count: number;
    open_amount: string;
    paid_count: number;
    paid_amount: string;
  }[];
  timing: { timing: string; label: string; count: number; amount: string }[];
  status_remarks: {
    id: number;
    created_at: string;
    remarks: string;
    payment_reference: string | null;
    paid_at: string | null;
    payable_id: number;
    client_name: string;
    from_status: string | null;
    to_status: string;
  }[];
  invoices: {
    id: number;
    payable_id: number;
    invoice_no: string | null;
    invoice_date: string | null;
    gross_amount: string;
    vat_amount: string;
    ewt_amount: string;
    net_amount: string;
    client_name: string;
    due_date: string;
    paid_at: string | null;
    status_name: string;
    status_category: string;
  }[];
}

export interface AiAskTurn {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  rowCount?: number;
}

export interface AiAskChart {
  type: 'bar' | 'doughnut';
  labelColumn: string | null;
  valueColumn: string | null;
}

export interface AiAskDataset {
  purpose: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface AiAskPendingAction {
  id: string;
  summary: string;
  /** When set, more info is needed before confirm (e.g. file / custom field). */
  awaiting?: 'source_account' | 'remarks' | 'check_date' | 'custom_fields' | 'file' | null;
}

export interface AiAskResponse {
  chatId: string;
  sessionReset: boolean;
  /** Natural-language answer after understanding (+ analyzing query results when a query ran). */
  explanation: string;
  sql: string | null;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  chart: AiAskChart | null;
  datasets: AiAskDataset[];
  messages: AiAskTurn[];
  /** Present when the AI proposed a payable mutation awaiting confirm/cancel. */
  pendingAction?: AiAskPendingAction | null;
}

export interface TelegramLinkStatus {
  linked: boolean;
  telegramUserId: string | null;
  linkedAt: string | null;
  botConfigured: boolean;
}

export interface TelegramLinkRow {
  userId: number;
  username: string;
  displayName: string;
  telegramUserId: string;
  linkedAt: string;
}

export interface TelegramPendingCode {
  code: string;
  userId: number;
  username: string;
  displayName: string;
  expiresAt: string;
}

export interface TelegramLinksOverview {
  links: TelegramLinkRow[];
  pendingCodes: TelegramPendingCode[];
  botConfigured: boolean;
}

export interface TelegramLinkCodeResponse {
  code: string;
  expiresAt: string;
  userId: number;
  displayName: string;
  username: string;
}

/** Readable message including zod field errors / per-item problems from the API. */
export function errorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : String(err);
  const d = err.details as
    | { fieldErrors?: Record<string, string[]>; formErrors?: string[]; problems?: string[] }
    | undefined;
  const parts: string[] = [];
  if (d?.fieldErrors) {
    for (const [field, msgs] of Object.entries(d.fieldErrors)) parts.push(`${field}: ${msgs.join(', ')}`);
  }
  if (d?.formErrors?.length) parts.push(...d.formErrors);
  if (d?.problems?.length) parts.push(...d.problems);
  return parts.length ? `${err.message} - ${parts.join('; ')}` : err.message;
}
