import { z } from 'zod';
import { isValidIsoDate } from './releaseWindow';
import { PERMISSION_KEYS } from './permissions';

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine(isValidIsoDate, 'Invalid calendar date');

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export const optionalText = z.preprocess(emptyToNull, z.string().trim().max(2000).nullable().optional());
export const optionalDate = z.preprocess(emptyToNull, isoDate.nullable().optional());
export const optionalId = z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable().optional());

/** Money is kept as a decimal string end-to-end to avoid float rounding. */
export const money = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim().replace(/,/g, ''))
  .refine((v) => /^\d{1,12}(\.\d{1,2})?$/.test(v), 'Amount must be a positive number with up to 2 decimals')
  .refine((v) => Number(v) > 0, 'Amount must be greater than zero');

export const idParam = z.object({ id: z.coerce.number().int().positive() });

export const boolQuery = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

export const STATUS_CATEGORIES = ['open', 'paid', 'cancelled'] as const;
export type StatusCategory = (typeof STATUS_CATEGORIES)[number];
export const statusCategory = z.enum(STATUS_CATEGORIES);

const payableStatusCustomFieldSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  label: z.string().trim().min(1).max(120),
  field_type: z.enum(['text', 'date']),
  show_in_list: z.boolean().optional().default(false),
  sort_order: z.coerce.number().int().min(0).max(10000).optional().default(0),
});

export const payableStatusSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: statusCategory,
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #1d4ed8')
    .optional()
    .default('#6b7280'),
  sort_order: z.coerce.number().int().min(0).max(10000).optional().default(0),
  active: z.boolean().optional().default(true),
  require_file: z.boolean().optional().default(false),
  custom_fields: z.array(payableStatusCustomFieldSchema).max(20).optional().default([]),
});

export const clientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  tin: optionalText,
  contact: optionalText,
  address: optionalText,
  bank_details: optionalText,
  payment_term_id: optionalId,
  active: z.boolean().optional().default(true),
});

export const paymentTypeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  active: z.boolean().optional().default(true),
});

export const arDeductionDescriptionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sort_order: z.coerce.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(1).max(100),
  requires_reference: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
});

export const paymentTermSchema = z.object({
  name: z.string().trim().min(1).max(100),
  days: z.coerce.number().int().min(0).max(3650),
  active: z.boolean().optional().default(true),
});

export const ewtKind = z.enum(['products', 'service']);

/** Positive decimal string, or null when the field is left blank. */
function optionalPositiveDecimal(scale: number, label: string) {
  return z.preprocess(emptyToNull, z.any()).transform((v, ctx) => {
    if (v == null || v === '') return null;
    const s = String(v).trim().replace(/,/g, '');
    const ok = new RegExp(`^\\d{1,10}(\\.\\d{1,${scale}})?$`).test(s) && Number(s) > 0;
    if (!ok) {
      ctx.addIssue({ code: 'custom', message: `${label} must be a positive number` });
      return z.NEVER;
    }
    return s;
  });
}

const fuelFields = {
  fuel_liters: optionalPositiveDecimal(3, 'Liters'),
  fuel_price_per_liter: optionalPositiveDecimal(4, 'Price per liter'),
  fuel_order_date: optionalDate,
  fuel_delivery_date: optionalDate,
  fuel_delivery_receipt: optionalText,
};

export const pdcLineSchema = z.object({
  pdc_no: optionalText,
  pdc_date: optionalDate,
  amount: money,
});

const pdcLinesSchema = z.array(pdcLineSchema).max(20);

const pdcGroupKey = z.string().trim().min(1).max(64);

/** One shared PDC; its amount is the sum of the nets of the invoices whose `pdc_group` is `key`. */
const pdcGroupsSchema = z
  .array(z.object({ key: pdcGroupKey, pdc_no: optionalText, pdc_date: optionalDate }))
  .max(100)
  .refine((groups) => new Set(groups.map((g) => g.key)).size === groups.length, 'Shared PDC keys must be unique')
  .optional();

/** Cross-payable shared check (separate batch create mode B). `null` on PUT means unlink — forbidden when linked. */
export const sharedPdcBatchSchema = z
  .object({
    pdc_no: optionalText,
    pdc_date: optionalDate,
  })
  .nullable()
  .optional();

/** An invoice is paid by its own `pdc_lines` or by the shared PDC named in `pdc_group`, never both. */
const invoicePdcFields = {
  /** Post-dated checks for this invoice alone; must sum to its net when the method is PDC. */
  pdc_lines: pdcLinesSchema.optional(),
  /** Key of the shared PDC in `pdc_groups`; null leaves any shared PDC. */
  pdc_group: pdcGroupKey.nullable().optional(),
};

function rejectDoubleCoverage(v: { pdc_lines?: unknown[]; pdc_group?: string | null }, ctx: z.RefinementCtx) {
  if (v.pdc_group != null && v.pdc_lines?.length) {
    ctx.addIssue({ code: 'custom', message: 'An invoice on a shared PDC cannot also have its own PDC lines', path: ['pdc_group'] });
  }
}

export const invoiceLineSchema = z
  .object({
    /** Stored invoice id on edit; PDC fields left out keep the PDC coverage stored under it. */
    id: optionalId,
    invoice_no: optionalText,
    invoice_date: optionalDate,
    /** Used when the line (or supplier) has no payment term. */
    due_date: optionalDate,
    /** Optional override of the supplier's default payment term. */
    payment_term_id: optionalId,
    gross_amount: money,
    ...invoicePdcFields,
  })
  .superRefine(rejectDoubleCoverage);

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

/**
 * Prefer `invoices` (one or more lines). Legacy single `amount` / invoice fields still work.
 * Optional `payment_term_id` (header or per line) overrides the supplier default;
 * due date is invoice date + term days, or a manual `due_date` when no term applies.
 */
export const payableSchema = z
  .object({
    client_id: z.coerce.number().int().positive(),
    payment_type_id: z.coerce.number().int().positive(),
    payment_method_id: z.coerce.number().int().positive(),
    /** Optional override of the supplier's default payment term (single-line / header). */
    payment_term_id: optionalId,
    invoice_no: optionalText,
    invoice_date: optionalDate,
    due_date: optionalDate,
    /** Net amount when no invoice lines are sent (legacy / simple entry). */
    amount: money.optional(),
    /** Gross amount when no invoice lines; defaults to amount when taxes are off. */
    gross_amount: money.optional(),
    invoices: z.array(invoiceLineSchema).min(1).max(100).optional(),
    pdc_groups: pdcGroupsSchema,
    shared_pdc_batch: sharedPdcBatchSchema,
    apply_vat: z.boolean().optional().default(false),
    vat_rate: z.coerce.number().min(0).max(100).optional().default(12),
    apply_ewt: z.boolean().optional().default(false),
    ewt_kind: z.preprocess(emptyToNull, ewtKind.nullable().optional()),
    description: optionalText,
    /** Defaults to the first active "open" status. */
    status_id: optionalId,
    paid_at: optionalDate,
    payment_reference: optionalText,
    /** Check date required when status is deposited/paid. */
    check_date: optionalDate,
    /** Optional remarks when saving a status change via PUT. */
    status_remarks: optionalText,
    /** Required when destination status defines custom fields (PUT status change). */
    custom_field_value: optionalText,
    custom_field_values: z.record(z.string(), z.union([z.string(), z.null()])).optional(),
    /** Admin assigns a staff user; staff creates are auto-assigned to self. */
    assigned_to: optionalId,
    /** Required when moving a payable to Create check for deposit. */
    source_account_id: optionalId,
    /** Save as draft (excluded from release totals). */
    is_draft: z.boolean().optional().default(false),
    ...fuelFields,
  })
  .superRefine((v, ctx) => {
    if (!v.invoices?.length && v.amount == null && v.gross_amount == null) {
      ctx.addIssue({ code: 'custom', message: 'Provide amount or at least one invoice', path: ['amount'] });
    }
    if (v.apply_ewt && !v.ewt_kind) {
      ctx.addIssue({ code: 'custom', message: 'Select products or service for EWT', path: ['ewt_kind'] });
    }
  });

export type PayableInput = z.infer<typeof payableSchema>;

/** Create several separate payable rows (one per invoice) sharing header fields. */
export const payableBatchSchema = z
  .object({
    client_id: z.coerce.number().int().positive(),
    payment_type_id: z.coerce.number().int().positive(),
    payment_method_id: z.coerce.number().int().positive(),
    payment_term_id: optionalId,
    due_date: optionalDate,
    invoices: z.array(invoiceLineSchema).min(1).max(100),
    apply_vat: z.boolean().optional().default(false),
    vat_rate: z.coerce.number().min(0).max(100).optional().default(12),
    apply_ewt: z.boolean().optional().default(false),
    ewt_kind: z.preprocess(emptyToNull, ewtKind.nullable().optional()),
    description: optionalText,
    status_id: optionalId,
    paid_at: optionalDate,
    payment_reference: optionalText,
    check_date: optionalDate,
    assigned_to: optionalId,
    source_account_id: optionalId,
    is_draft: z.boolean().optional().default(false),
    ...fuelFields,
  })
  .superRefine((v, ctx) => {
    if (v.apply_ewt && !v.ewt_kind) {
      ctx.addIssue({ code: 'custom', message: 'Select products or service for EWT', path: ['ewt_kind'] });
    }
    v.invoices.forEach((inv, i) => {
      if (inv.pdc_group != null) {
        ctx.addIssue({
          code: 'custom',
          message: 'Shared PDC groups are not supported on batch create; send per-payable pdc_lines instead',
          path: ['invoices', i, 'pdc_group'],
        });
      }
    });
  });

export type PayableBatchInput = z.infer<typeof payableBatchSchema>;

export const payableListQuery = z.object({
  category: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined))
    .pipe(z.array(statusCategory).optional()),
  statusId: z.coerce.number().int().positive().optional(),
  clientId: z.coerce.number().int().positive().optional(),
  typeId: z.coerce.number().int().positive().optional(),
  methodId: z.coerce.number().int().positive().optional(),
  dueFrom: isoDate.optional(),
  dueTo: isoDate.optional(),
  search: z.string().trim().max(200).optional(),
  /** Dedicated payment reference filter (any text; typically numeric). */
  reference: z.string().trim().max(200).optional(),
  /** When true, include drafts; default hides them. */
  includeDrafts: boolQuery.optional().default('false'),
  /** When true, only drafts. */
  draftsOnly: boolQuery.optional().default('false'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(500).optional().default(50),
  sort: z
    .enum(['due_date', 'amount', 'client', 'created_at', 'invoice_date', 'payment_reference'])
    .optional()
    .default('due_date'),
  dir: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const SOURCE_TXN_STATUSES = [
  'PENDING',
  'POSTED',
  'RESERVED',
  'CANCELLED',
  'REVERSED',
  'ON_HOLD',
] as const;
export type SourceTxnStatus = (typeof SOURCE_TXN_STATUSES)[number];
export const sourceTxnStatus = z.enum(SOURCE_TXN_STATUSES);

export const statusPatchSchema = z.object({
  status_id: z.coerce.number().int().positive(),
  paid_at: optionalDate,
  payment_reference: optionalText,
  check_date: optionalDate,
  remarks: optionalText,
  /** Required when moving to Create check for deposit. */
  source_account_id: optionalId,
  /** Optional reassignment (admin or current assignee). Omit to leave assignee unchanged. */
  assigned_to: optionalId,
  /** Required when destination status defines custom fields. */
  custom_field_value: optionalText,
  custom_field_values: z.record(z.string(), z.union([z.string(), z.null()])).optional(),
  /** PDC coverage per stored invoice id; omitted invoices keep their stored coverage. */
  invoices: z
    .array(z.object({ id: z.coerce.number().int().positive(), ...invoicePdcFields }).superRefine(rejectDoubleCoverage))
    .max(100)
    .optional(),
  pdc_groups: pdcGroupsSchema,
  shared_pdc_batch: sharedPdcBatchSchema,
});

export const sourceAccountSchema = z.object({
  bank_name: z.string().trim().min(1).max(200),
  account_number: z.string().trim().min(1).max(100),
  active: z.boolean().optional().default(true),
  /** Optional opening deposit created as POSTED when creating the account. */
  initial_deposit: money.optional(),
  initial_deposit_date: optionalDate,
  initial_deposit_remarks: optionalText,
});

export const sourceTxnCreateSchema = z
  .object({
    source_account_id: z.coerce.number().int().positive(),
    deposit_amount: money.optional(),
    withdraw_amount: money.optional(),
    transaction_date: isoDate,
    status: sourceTxnStatus.optional().default('POSTED'),
    remarks: optionalText,
  })
  .superRefine((v, ctx) => {
    const hasDeposit = v.deposit_amount != null;
    const hasWithdraw = v.withdraw_amount != null;
    if (hasDeposit === hasWithdraw) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide exactly one of deposit_amount or withdraw_amount',
        path: ['deposit_amount'],
      });
    }
  });

export const sourceTxnPatchSchema = z.object({
  status: sourceTxnStatus.optional(),
  remarks: optionalText,
  transaction_date: optionalDate,
});

export const sourceTransferSchema = z.object({
  from_account_id: z.coerce.number().int().positive(),
  to_account_id: z.coerce.number().int().positive(),
  amount: money,
  transaction_date: isoDate,
  status: sourceTxnStatus.optional().default('POSTED'),
  remarks: optionalText,
});

export const settingsSchema = z.object({
  release_weekday: z.coerce.number().int().min(0).max(6),
  days_before: z.coerce.number().int().min(0).max(365),
  days_after: z.coerce.number().int().min(0).max(365),
  include_overdue: z.boolean(),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Unknown IANA timezone'),
  /** Days after AR billing date to set due date (default 30). */
  ar_due_days: z.coerce.number().int().min(0).max(365).optional().default(30),
});

export const upcomingQuery = z.object({
  releaseDate: isoDate.optional(),
  daysBefore: z.coerce.number().int().min(0).max(365).optional(),
  daysAfter: z.coerce.number().int().min(0).max(365).optional(),
  includeOverdue: boolQuery.optional(),
  showPaid: boolQuery.optional().default('true'),
  /** Dedicated payment reference filter (any text; typically numeric). */
  reference: z.string().trim().max(200).optional(),
});

export const bulkStatusSchema = z.object({
  status_id: z.coerce.number().int().positive(),
  paid_at: optionalDate,
  check_date: optionalDate,
  remarks: optionalText,
  /** Shared source account when bulk-setting to Create check for deposit. */
  source_account_id: optionalId,
  /** Optional reassignment applied to every item (admin or each item's assignee). */
  assigned_to: optionalId,
  items: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        payment_reference: optionalText,
      }),
    )
    .min(1)
    .max(1000),
});

export const liquidationSchema = z.object({
  payee_name: z.string().trim().min(1).max(200),
  assigned_to: optionalId,
  source_account_id: optionalId,
  advance_amount: money,
  advance_date: isoDate,
  remarks: optionalText,
});

export const liquidationLineSchema = z.object({
  line_date: isoDate,
  description: z.string().trim().min(1).max(2000),
  amount: money,
});

export const truckAllowanceSchema = z.object({
  /** Stored as truck_id; UI label is Particular. */
  truck_id: z.string().trim().min(1).max(100),
  allowance_date: isoDate,
  /** Optional; defaults to first day of allowance_date's month. */
  period_month: isoDate.optional(),
  amount: money,
  payee_name: optionalText,
  remarks: optionalText,
  source_account_id: optionalId,
});

const permissionsSchema = z.object(
  Object.fromEntries(PERMISSION_KEYS.map((k) => [k, z.boolean().optional().default(false)])) as Record<
    (typeof PERMISSION_KEYS)[number],
    z.ZodDefault<z.ZodOptional<z.ZodBoolean>>
  >,
);

export const userCreateSchema = z.object({
  username: z.string().trim().min(1).max(100),
  display_name: z.string().trim().min(1).max(200),
  password: z.string().min(6).max(200),
  role: z.enum(['admin', 'staff']).optional().default('staff'),
  active: z.boolean().optional().default(true),
  permissions: permissionsSchema.optional(),
  payable_status_ids: z.array(z.coerce.number().int().positive()).optional(),
  payable_default_status_ids: z.array(z.coerce.number().int().positive()).optional(),
});

export const userUpdateSchema = z.object({
  username: z.string().trim().min(1).max(100).optional(),
  display_name: z.string().trim().min(1).max(200).optional(),
  password: z.string().min(6).max(200).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  active: z.boolean().optional(),
  permissions: permissionsSchema.optional(),
  payable_status_ids: z.array(z.coerce.number().int().positive()).optional(),
  payable_default_status_ids: z.array(z.coerce.number().int().positive()).optional(),
});
