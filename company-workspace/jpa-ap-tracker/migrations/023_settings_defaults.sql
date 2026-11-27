-- Ensure canonical Settings defaults on existing databases.
-- Release schedule: Friday, 7 days before, 0 after, Asia/Manila.
-- AR due days: 30.
UPDATE settings
   SET release_weekday = 5,
       days_before = 7,
       days_after = 0,
       timezone = 'Asia/Manila',
       ar_due_days = 30
 WHERE id = 1;
