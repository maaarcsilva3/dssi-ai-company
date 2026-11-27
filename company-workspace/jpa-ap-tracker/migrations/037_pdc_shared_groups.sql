-- Shared PDC: one post-dated check pays several invoices of the same payable in full.
-- Its amount is the sum of its invoices' nets, so it is derived on read, not stored.

CREATE TABLE IF NOT EXISTS payable_pdc_groups (
  id SERIAL PRIMARY KEY,
  payable_id INTEGER NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
  pdc_no TEXT,
  pdc_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, payable_id)
);

CREATE INDEX IF NOT EXISTS payable_pdc_groups_payable_id_idx ON payable_pdc_groups (payable_id);

-- The primary key puts an invoice on at most one shared PDC; both foreign keys pin it to the group's payable.
CREATE TABLE IF NOT EXISTS payable_pdc_group_invoices (
  payable_invoice_id INTEGER PRIMARY KEY,
  group_id INTEGER NOT NULL,
  payable_id INTEGER NOT NULL,
  FOREIGN KEY (group_id, payable_id) REFERENCES payable_pdc_groups (id, payable_id) ON DELETE CASCADE,
  FOREIGN KEY (payable_invoice_id, payable_id) REFERENCES payable_invoices (id, payable_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS payable_pdc_group_invoices_group_id_idx ON payable_pdc_group_invoices (group_id);
