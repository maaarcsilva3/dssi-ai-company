-- User-defined payable statuses. `category` drives behaviour:
--   open      = still to be released (shows on Upcoming Release, counts in "to release")
--   paid      = released; requires paid_at (and a reference when the payment format needs one)
--   cancelled = ignored by release totals
CREATE TABLE payable_statuses (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('open', 'paid', 'cancelled')),
  color      TEXT NOT NULL DEFAULT '#6b7280' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payable_statuses_name_uq ON payable_statuses (lower(name));
CREATE TRIGGER payable_statuses_updated_at BEFORE UPDATE ON payable_statuses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO payable_statuses (name, category, color, sort_order) VALUES
  ('For review', 'open', '#b91c1c', 10),
  ('Create Check for Deposit', 'open', '#1d4ed8', 20),
  ('Create Check for Release', 'open', '#7c3aed', 30),
  ('Check Deposited', 'open', '#0d9488', 40),
  ('Check Released', 'paid', '#047857', 50),
  ('Cancelled', 'cancelled', '#4b5563', 60);

ALTER TABLE payables ADD COLUMN status_id INTEGER REFERENCES payable_statuses(id);
UPDATE payables p
   SET status_id = s.id
  FROM payable_statuses s
 WHERE (p.status::text = 'unpaid' AND s.name = 'For review')
    OR (p.status::text = 'scheduled' AND s.name = 'Create Check for Deposit')
    OR (p.status::text = 'paid' AND s.name = 'Check Released')
    OR (p.status::text = 'cancelled' AND s.name = 'Cancelled');
-- Fallback for any leftover rows
UPDATE payables p
   SET status_id = (SELECT id FROM payable_statuses WHERE name = 'For review' LIMIT 1)
 WHERE status_id IS NULL;
ALTER TABLE payables ALTER COLUMN status_id SET NOT NULL;

DROP INDEX payables_status_due_idx;
ALTER TABLE payables DROP COLUMN status;
DROP TYPE payable_status;

CREATE INDEX payables_due_idx ON payables (due_date);
CREATE INDEX payables_status_idx ON payables (status_id);
