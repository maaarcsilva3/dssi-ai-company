import { z } from 'zod';
import { isoDate, money, optionalId, optionalText } from './validation';

export const tripClassification = z.enum(['FORWARD HAUL', 'BACK HAUL']);
export const tripType = z.enum(['IIS', 'LUZON', 'CROSSDOCK']);
export const fleetType = z.enum(['10W', '6W']);
export const serviceType = z.enum(['ON-CALL', 'WETLEASE']);

export const arClientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  tin: optionalText,
  address: optionalText,
  contact: optionalText,
  default_trip_classification: z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    tripClassification.nullable().optional(),
  ),
  active: z.boolean().optional().default(true),
});

export const arDetailSchema = z.object({
  summary_id: z.coerce.number().int().positive().optional(),
  invoice_no: z.string().trim().min(1).max(100),
  /** Shipment / trip date. */
  entry_date: isoDate,
  /** Billing date (from SI sheet on import). */
  billing_date: z.preprocess((v) => (v === '' ? null : v), isoDate.nullable().optional()),
  /** When set, aging starts from this date instead of billing / invoice date. */
  receiving_date: z.preprocess((v) => (v === '' ? null : v), isoDate.nullable().optional()),
  reference: optionalText,
  origin: optionalText,
  destination: optionalText,
  amount: money,
});

export const arSummaryPatchSchema = z.object({
  trip_classification: tripClassification.nullable().optional(),
  trip_type: tripType.nullable().optional(),
  fleet_type: fleetType.nullable().optional(),
  service_type: serviceType.nullable().optional(),
  billing_reference: optionalText,
  coverage_start: z.preprocess((v) => (v === '' ? null : v), isoDate.nullable().optional()),
  coverage_end: z.preprocess((v) => (v === '' ? null : v), isoDate.nullable().optional()),
  invoice_date: z.preprocess((v) => (v === '' ? null : v), isoDate.nullable().optional()),
  client_id: optionalId,
  payment_status: z.enum(['unpaid', 'paid']).optional(),
  due_date: z.preprocess((v) => (v === '' ? null : v), isoDate.nullable().optional()),
  acknowledgment_receipt_no: optionalText,
});

export const ar2307Schema = z.object({
  ewt_2307_status: z.enum(['pending', 'submitted']),
  ewt_2307_submitted_at: z.preprocess((v) => (v === '' ? null : v), isoDate.nullable().optional()),
}).superRefine((v, ctx) => {
  if (v.ewt_2307_status === 'submitted' && !v.ewt_2307_submitted_at) {
    ctx.addIssue({ code: 'custom', message: 'Submitted date is required', path: ['ewt_2307_submitted_at'] });
  }
});

export const arDeductionSchema = z.object({
  description: z.string().trim().min(1).max(2000),
  amount: money,
});
