-- Detail line shipment date remains entry_date; billing_date comes from the SI sheet.
ALTER TABLE ar_detail_entries
  ADD COLUMN IF NOT EXISTS billing_date DATE;

UPDATE ar_detail_entries d
   SET billing_date = s.invoice_date
  FROM ar_summaries s
 WHERE s.id = d.summary_id
   AND d.billing_date IS NULL
   AND s.invoice_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS ar_detail_entries_billing_date_idx
  ON ar_detail_entries (billing_date);
