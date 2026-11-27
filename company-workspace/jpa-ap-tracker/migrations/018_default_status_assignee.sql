-- One default payable status per user: when a payable enters that status, assign this user.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS default_payable_status_id INTEGER
    REFERENCES payable_statuses(id) ON DELETE SET NULL;

-- Each status can be the default for at most one user.
CREATE UNIQUE INDEX IF NOT EXISTS users_default_payable_status_id_uidx
  ON users (default_payable_status_id)
  WHERE default_payable_status_id IS NOT NULL;

-- Backfill from multi-default table (one status per user; skip status conflicts).
UPDATE users u
   SET default_payable_status_id = d.status_id
  FROM (
    SELECT DISTINCT ON (user_id) user_id, status_id
      FROM user_payable_default_statuses
     ORDER BY user_id, status_id
  ) d
 WHERE u.id = d.user_id
   AND u.default_payable_status_id IS NULL
   AND NOT EXISTS (
     SELECT 1 FROM users u2
      WHERE u2.default_payable_status_id = d.status_id
        AND u2.id <> d.user_id
   );

DROP TABLE IF EXISTS user_payable_default_statuses;
