-- AR summary payment tracking + configurable due-day default.
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS ar_due_days INTEGER NOT NULL DEFAULT 30
    CHECK (ar_due_days >= 0 AND ar_due_days <= 365);

ALTER TABLE ar_summaries
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid')),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS acknowledgment_receipt_no TEXT;

-- Backfill due dates from billing (invoice) date + current settings default.
UPDATE ar_summaries s
   SET due_date = (s.invoice_date + (SELECT ar_due_days FROM settings WHERE id = 1) * INTERVAL '1 day')::date
 WHERE s.due_date IS NULL
   AND s.invoice_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS ar_summaries_payment_status_idx ON ar_summaries (payment_status);
CREATE INDEX IF NOT EXISTS ar_summaries_due_date_idx ON ar_summaries (due_date);
