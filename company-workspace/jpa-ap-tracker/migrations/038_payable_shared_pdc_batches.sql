-- Cross-payable shared PDC: separate batch create "one check for all" links sibling payables.

CREATE TABLE IF NOT EXISTS payable_shared_pdc_batches (
  id SERIAL PRIMARY KEY,
  pdc_no TEXT,
  pdc_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER payable_shared_pdc_batches_updated_at
  BEFORE UPDATE ON payable_shared_pdc_batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE payables
  ADD COLUMN IF NOT EXISTS shared_pdc_batch_id INTEGER REFERENCES payable_shared_pdc_batches (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payables_shared_pdc_batch_id_idx ON payables (shared_pdc_batch_id);