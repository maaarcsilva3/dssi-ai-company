-- Each payable status may be a default for at most one user.
-- Prefer Crissa (mscrissa) when duplicates exist; otherwise keep lowest user_id.

DELETE FROM user_payable_default_statuses d
 WHERE d.ctid NOT IN (
   SELECT kept.ctid
     FROM (
       SELECT DISTINCT ON (d2.status_id) d2.ctid
         FROM user_payable_default_statuses d2
         JOIN users u ON u.id = d2.user_id
        ORDER BY d2.status_id,
                 CASE WHEN lower(u.username) = 'mscrissa' THEN 0 ELSE 1 END,
                 d2.user_id
     ) kept
 );

CREATE UNIQUE INDEX IF NOT EXISTS user_payable_default_statuses_status_uidx
  ON user_payable_default_statuses (status_id);
