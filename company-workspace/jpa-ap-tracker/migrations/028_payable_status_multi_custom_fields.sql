-- Multiple custom fields per payable status.

CREATE TABLE IF NOT EXISTS payable_status_custom_fields (
  id            SERIAL PRIMARY KEY,
  status_id     INTEGER NOT NULL REFERENCES payable_statuses(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  field_type    TEXT NOT NULL CHECK (field_type IN ('text', 'date')),
  show_in_list  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT payable_status_custom_fields_label_ck CHECK (btrim(label) <> '')
);

CREATE INDEX IF NOT EXISTS payable_status_custom_fields_status_idx
  ON payable_status_custom_fields (status_id, sort_order, id);

-- Migrate legacy single-field columns when they still exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'payable_statuses' AND column_name = 'custom_field_label'
  ) THEN
    INSERT INTO payable_status_custom_fields (status_id, label, field_type, show_in_list, sort_order)
    SELECT s.id,
           btrim(s.custom_field_label),
           s.custom_field_type,
           COALESCE(s.show_custom_field_in_list, FALSE),
           0
      FROM payable_statuses s
     WHERE s.custom_field_label IS NOT NULL
       AND btrim(s.custom_field_label) <> ''
       AND s.custom_field_type IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM payable_status_custom_fields cf WHERE cf.status_id = s.id
       );
  END IF;
END $$;

-- Rebuild field values keyed by custom_field_id when still on legacy status_id PK.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'payable_status_field_values' AND column_name = 'status_id'
  ) THEN
    CREATE TABLE IF NOT EXISTS payable_status_field_values_v2 (
      payable_id      INTEGER NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
      custom_field_id INTEGER NOT NULL REFERENCES payable_status_custom_fields(id) ON DELETE CASCADE,
      value           TEXT NOT NULL,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (payable_id, custom_field_id)
    );

    INSERT INTO payable_status_field_values_v2 (payable_id, custom_field_id, value, updated_at)
    SELECT psfv.payable_id, cf.id, psfv.value, psfv.updated_at
      FROM payable_status_field_values psfv
      JOIN payable_status_custom_fields cf ON cf.status_id = psfv.status_id
    ON CONFLICT (payable_id, custom_field_id) DO NOTHING;

    DROP TABLE payable_status_field_values;
    ALTER TABLE payable_status_field_values_v2 RENAME TO payable_status_field_values;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'payable_status_field_values'
  ) THEN
    CREATE TABLE payable_status_field_values (
      payable_id      INTEGER NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
      custom_field_id INTEGER NOT NULL REFERENCES payable_status_custom_fields(id) ON DELETE CASCADE,
      value           TEXT NOT NULL,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (payable_id, custom_field_id)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS payable_status_field_values_field_idx
  ON payable_status_field_values (custom_field_id);

ALTER TABLE payable_status_history
  ADD COLUMN IF NOT EXISTS custom_field_values JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill history JSON from legacy single value when a matching field exists.
UPDATE payable_status_history h
   SET custom_field_values = jsonb_build_object(cf.id::text, h.custom_field_value)
  FROM payable_status_custom_fields cf
 WHERE h.to_status_id = cf.status_id
   AND h.custom_field_value IS NOT NULL
   AND btrim(h.custom_field_value) <> ''
   AND (h.custom_field_values IS NULL OR h.custom_field_values = '{}'::jsonb)
   AND cf.id = (
     SELECT MIN(cf2.id) FROM payable_status_custom_fields cf2 WHERE cf2.status_id = h.to_status_id
   );

-- Drop legacy single-field columns on statuses.
ALTER TABLE payable_statuses
  DROP CONSTRAINT IF EXISTS payable_statuses_custom_field_ck;

ALTER TABLE payable_statuses
  DROP COLUMN IF EXISTS custom_field_label,
  DROP COLUMN IF EXISTS custom_field_type,
  DROP COLUMN IF EXISTS show_custom_field_in_list;
