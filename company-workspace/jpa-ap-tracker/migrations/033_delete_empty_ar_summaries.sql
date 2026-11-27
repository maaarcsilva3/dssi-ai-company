-- Monthly summaries are driven by billing lines. Remove invoice shells with no details.
DELETE FROM ar_summaries s
 WHERE NOT EXISTS (
   SELECT 1 FROM ar_detail_entries d WHERE d.summary_id = s.id
 );
