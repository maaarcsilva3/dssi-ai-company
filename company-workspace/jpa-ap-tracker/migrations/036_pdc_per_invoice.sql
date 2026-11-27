-- PDC schedule belongs to an invoice line, not the payable header.

ALTER TABLE payable_pdc_lines ADD COLUMN IF NOT EXISTS payable_invoice_id INTEGER;

-- ASSUMPTION: legacy rows (one schedule per payable) belong to the payable's first invoice.
UPDATE payable_pdc_lines pl
   SET payable_invoice_id = (
     SELECT pi.id
       FROM payable_invoices pi
      WHERE pi.payable_id = pl.payable_id
      ORDER BY pi.sort_order, pi.id
      LIMIT 1
   )
 WHERE pl.payable_invoice_id IS NULL;

DELETE FROM payable_pdc_lines WHERE payable_invoice_id IS NULL;

ALTER TABLE payable_pdc_lines ALTER COLUMN payable_invoice_id SET NOT NULL;

-- FK target for (invoice, payable) so a PDC line cannot point at another payable's invoice.
ALTER TABLE payable_invoices
  ADD CONSTRAINT payable_invoices_id_payable_id_key UNIQUE (id, payable_id);

ALTER TABLE payable_pdc_lines
  ADD CONSTRAINT payable_pdc_lines_invoice_fkey
  FOREIGN KEY (payable_invoice_id, payable_id)
  REFERENCES payable_invoices (id, payable_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS payable_pdc_lines_payable_invoice_id_idx ON payable_pdc_lines (payable_invoice_id);
