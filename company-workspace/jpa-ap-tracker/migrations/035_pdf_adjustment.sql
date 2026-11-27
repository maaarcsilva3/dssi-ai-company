-- PDF adjustment: PDC schedule, workflow default assignees, staff status permissions.

CREATE TABLE IF NOT EXISTS payable_pdc_lines (
  id SERIAL PRIMARY KEY,
  payable_id INTEGER NOT NULL REFERENCES payables(id) ON DELETE CASCADE,
  pdc_no TEXT,
  pdc_date DATE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payable_pdc_lines_payable_id_idx ON payable_pdc_lines (payable_id);

-- Optional admin display label (Jea)
UPDATE users
   SET display_name = 'Jea',
       updated_at = now()
 WHERE role = 'admin' AND lower(username) = 'admin';

-- Exclusive default assignees per workflow step (idempotent)
DELETE FROM user_payable_default_statuses d
 USING users u
 WHERE d.user_id = u.id
   AND lower(u.username) IN ('msjeanette', 'mscrissa')
   AND d.status_id IN (
     SELECT id FROM payable_statuses
      WHERE active AND sort_order > 0
   );

INSERT INTO user_payable_default_statuses (user_id, status_id)
SELECT u.id, s.id
  FROM users u
  CROSS JOIN payable_statuses s
 WHERE lower(u.username) = 'msjeanette'
   AND s.active
   AND lower(s.name) IN ('for review', 'check deposited', 'check released')
ON CONFLICT DO NOTHING;

INSERT INTO user_payable_default_statuses (user_id, status_id)
SELECT u.id, s.id
  FROM users u
  CROSS JOIN payable_statuses s
 WHERE lower(u.username) = 'mscrissa'
   AND s.active
   AND lower(s.name) IN ('create check for deposit', 'create check for release')
ON CONFLICT DO NOTHING;

-- Staff destination permissions (enforce on PATCH status when non-empty)
DELETE FROM user_payable_status_permissions p
 USING users u
 WHERE p.user_id = u.id AND lower(u.username) IN ('msjeanette', 'mscrissa');

INSERT INTO user_payable_status_permissions (user_id, status_id)
SELECT u.id, s.id
  FROM users u
  CROSS JOIN payable_statuses s
 WHERE lower(u.username) = 'msjeanette'
   AND s.active
   AND (
     lower(s.name) IN ('for review', 'check deposited', 'check released')
     OR s.sort_order = 0
   )
ON CONFLICT DO NOTHING;

INSERT INTO user_payable_status_permissions (user_id, status_id)
SELECT u.id, s.id
  FROM users u
  CROSS JOIN payable_statuses s
 WHERE lower(u.username) = 'mscrissa'
   AND s.active
   AND (
     lower(s.name) IN (
       'create check for deposit',
       'create check for release',
       'check deposited',
       'check released'
     )
     OR s.sort_order = 0
   )
ON CONFLICT DO NOTHING;