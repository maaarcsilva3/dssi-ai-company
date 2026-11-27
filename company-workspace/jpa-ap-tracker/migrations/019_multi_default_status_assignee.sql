-- Multiple default statuses per user (auto-assignee when a payable enters any of them).
-- Each status still maps to at most one user.
CREATE TABLE IF NOT EXISTS user_payable_default_statuses (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status_id INTEGER NOT NULL REFERENCES payable_statuses(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, status_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_payable_default_statuses_status_uidx
  ON user_payable_default_statuses (status_id);

-- Backfill from the previous single-column binding.
INSERT INTO user_payable_default_statuses (user_id, status_id)
SELECT id, default_payable_status_id
  FROM users
 WHERE default_payable_status_id IS NOT NULL
ON CONFLICT DO NOTHING;

DROP INDEX IF EXISTS users_default_payable_status_id_uidx;

ALTER TABLE users
  DROP COLUMN IF EXISTS default_payable_status_id;
