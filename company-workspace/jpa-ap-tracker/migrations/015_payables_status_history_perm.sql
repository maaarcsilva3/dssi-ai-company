-- Permission to view payable status history.

ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS payables_status_history BOOLEAN NOT NULL DEFAULT FALSE;
