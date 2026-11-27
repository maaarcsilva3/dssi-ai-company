-- BIR 2307 submission file on AR summaries.

ALTER TABLE ar_summaries
  ADD COLUMN IF NOT EXISTS ewt_2307_original_name TEXT,
  ADD COLUMN IF NOT EXISTS ewt_2307_stored_name TEXT,
  ADD COLUMN IF NOT EXISTS ewt_2307_mime TEXT,
  ADD COLUMN IF NOT EXISTS ewt_2307_size INTEGER;
