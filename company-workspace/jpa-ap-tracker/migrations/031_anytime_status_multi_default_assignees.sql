-- Anytime statuses (sort_order = 0, e.g. Rejected / Cancelled) may be default-bound
-- to multiple users. Workflow steps (sort_order > 0) stay exclusive in application code.
-- Drop the global unique-on-status_id index that blocked multi-bind.

DROP INDEX IF EXISTS user_payable_default_statuses_status_uidx;

CREATE INDEX IF NOT EXISTS user_payable_default_statuses_status_idx
  ON user_payable_default_statuses (status_id);
