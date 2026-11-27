-- Masterdata list for AR summary deduction description dropdown.
CREATE TABLE IF NOT EXISTS ar_deduction_descriptions (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ar_deduction_descriptions_name_uq
  ON ar_deduction_descriptions (lower(trim(name)));

CREATE TRIGGER ar_deduction_descriptions_updated_at
  BEFORE UPDATE ON ar_deduction_descriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO ar_deduction_descriptions (name, sort_order)
SELECT v.name, v.sort_order
  FROM (VALUES
    ('Volume Discount', 10),
    ('Toll Fee', 20),
    ('Parking', 30),
    ('Other', 40)
  ) AS v(name, sort_order)
 WHERE NOT EXISTS (
   SELECT 1 FROM ar_deduction_descriptions d WHERE lower(trim(d.name)) = lower(trim(v.name))
 );
