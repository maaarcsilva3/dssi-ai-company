-- Receiving date on AR detail lines. When set, aging starts from this date
-- instead of the summary invoice / billing date.

ALTER TABLE ar_detail_entries
  ADD COLUMN IF NOT EXISTS receiving_date DATE;

CREATE INDEX IF NOT EXISTS ar_detail_entries_receiving_date_idx
  ON ar_detail_entries (receiving_date);
