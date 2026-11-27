import { crudRouter } from './crud';
import { pool } from '../db';
import { HttpError } from '../lib/http';
import {
  listPayableStatusCustomFields,
  replacePayableStatusCustomFields,
  type CustomFieldInput,
} from '../lib/payableStatusAccess';
import {
  arDeductionDescriptionSchema,
  clientSchema,
  payableStatusSchema,
  paymentMethodSchema,
  paymentTermSchema,
  paymentTypeSchema,
} from '../lib/validation';

async function shapePayableStatus(row: Record<string, unknown>) {
  const custom_fields = await listPayableStatusCustomFields(pool, Number(row.id));
  return { ...row, custom_fields };
}

export const statusesRouter = crudRouter({
  table: 'payable_statuses',
  label: 'Status',
  columns: ['name', 'category', 'color', 'sort_order', 'active', 'require_file'],
  schema: payableStatusSchema,
  references: [{ table: 'payables', column: 'status_id' }],
  orderBy: 'sort_order, lower(name)',
  shapeRow: shapePayableStatus,
  // Changing the category of a status in use would silently flip payables between open/paid.
  beforeUpdate: async (id, data) => {
    const { rows } = await pool.query(
      `SELECT s.category, EXISTS (SELECT 1 FROM payables p WHERE p.status_id = s.id) AS in_use
         FROM payable_statuses s WHERE s.id = $1`,
      [id],
    );
    if (rows[0]?.in_use && rows[0].category !== data.category) {
      throw new HttpError(409, 'This status is used by payables, so its category cannot be changed. Create a new status instead.');
    }
  },
  afterWrite: async (id, data, row) => {
    const fields = (data.custom_fields as CustomFieldInput[] | undefined) ?? [];
    const custom_fields = await replacePayableStatusCustomFields(pool, id, fields);
    return { ...row, custom_fields };
  },
});

export const receivableStatusesRouter = crudRouter({
  table: 'receivable_statuses',
  label: 'Status',
  columns: ['name', 'category', 'color', 'sort_order', 'active'],
  schema: payableStatusSchema,
  references: [{ table: 'receivables', column: 'status_id' }],
  orderBy: 'sort_order, lower(name)',
  beforeUpdate: async (id, data) => {
    const { rows } = await pool.query(
      `SELECT s.category, EXISTS (SELECT 1 FROM receivables r WHERE r.status_id = s.id) AS in_use
         FROM receivable_statuses s WHERE s.id = $1`,
      [id],
    );
    if (rows[0]?.in_use && rows[0].category !== data.category) {
      throw new HttpError(409, 'This status is used by receivables, so its category cannot be changed. Create a new status instead.');
    }
  },
});

export const clientsRouter = crudRouter({
  table: 'clients',
  label: 'Supplier',
  columns: ['name', 'tin', 'contact', 'address', 'bank_details', 'payment_term_id', 'active'],
  schema: clientSchema,
  references: [{ table: 'payables', column: 'client_id' }],
});

export const customersRouter = crudRouter({
  table: 'customers',
  label: 'Customer',
  columns: ['name', 'tin', 'contact', 'address', 'bank_details', 'payment_term_id', 'active'],
  schema: clientSchema,
  references: [{ table: 'receivables', column: 'client_id' }],
});

export const paymentTypesRouter = crudRouter({
  table: 'payment_types',
  label: 'Payment type',
  columns: ['name', 'active'],
  schema: paymentTypeSchema,
  references: [
    { table: 'payables', column: 'payment_type_id' },
    { table: 'receivables', column: 'payment_type_id' },
  ],
});

export const paymentMethodsRouter = crudRouter({
  table: 'payment_methods',
  label: 'Payment method',
  columns: ['name', 'requires_reference', 'active'],
  schema: paymentMethodSchema,
  references: [
    { table: 'payables', column: 'payment_method_id' },
    { table: 'receivables', column: 'payment_method_id' },
  ],
});

export const paymentTermsRouter = crudRouter({
  table: 'payment_terms',
  label: 'Payment term',
  columns: ['name', 'days', 'active'],
  schema: paymentTermSchema,
  references: [
    { table: 'payables', column: 'payment_term_id' },
    { table: 'receivables', column: 'payment_term_id' },
    { table: 'clients', column: 'payment_term_id' },
    { table: 'customers', column: 'payment_term_id' },
  ],
});

export const arDeductionDescriptionsRouter = crudRouter({
  table: 'ar_deduction_descriptions',
  label: 'AR deduction description',
  columns: ['name', 'sort_order', 'active'],
  schema: arDeductionDescriptionSchema,
  // Descriptions are stored as text on deductions; deactivating is enough.
  references: [],
  orderBy: 'sort_order, lower(name)',
});
