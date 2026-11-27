-- Strict AP status workflow: per-status file/custom-field gates + suppliers permission.

ALTER TABLE payable_statuses
  ADD COLUMN IF NOT EXISTS require_file BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_field_label TEXT,
  ADD COLUMN IF NOT EXISTS custom_field_type TEXT
    CHECK (custom_field_type IS NULL OR custom_field_type IN ('text', 'date')),
  ADD COLUMN IF NOT EXISTS show_custom_field_in_list BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE payable_statuses
  DROP CONSTRAINT IF EXISTS payable_statuses_custom_field_ck;

ALTER TABLE payable_statuses
  ADD CONSTRAINT payable_statuses_custom_field_ck CHECK (
    (custom_field_label IS NULL AND custom_field_type IS NULL AND show_custom_field_in_list = FALSE)
    OR (custom_field_label IS NOT NULL AND btrim(custom_field_label) <> '' AND custom_field_type IS NOT NULL)
  );

CREATE TABLE IF NOT EXISTS payable_status_field_values (
  payable_id INTEGER NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
  status_id  INTEGER NOT NULL REFERENCES payable_statuses(id) ON DELETE CASCADE,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (payable_id, status_id)
);

CREATE INDEX IF NOT EXISTS payable_status_field_values_status_idx
  ON payable_status_field_values (status_id);

ALTER TABLE payable_status_history
  ADD COLUMN IF NOT EXISTS custom_field_value TEXT;

ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS suppliers BOOLEAN NOT NULL DEFAULT FALSE;
