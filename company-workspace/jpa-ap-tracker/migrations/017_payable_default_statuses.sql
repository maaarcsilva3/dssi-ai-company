-- Default create/submit statuses (separate from statuses a user may change into).
CREATE TABLE IF NOT EXISTS user_payable_default_statuses (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status_id INTEGER NOT NULL REFERENCES payable_statuses(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, status_id)
);

CREATE INDEX IF NOT EXISTS user_payable_default_statuses_status_idx
  ON user_payable_default_statuses (status_id);

-- Preserve existing create behavior: copy prior status permissions into defaults.
INSERT INTO user_payable_default_statuses (user_id, status_id)
SELECT user_id, status_id FROM user_payable_status_permissions
ON CONFLICT DO NOTHING;
