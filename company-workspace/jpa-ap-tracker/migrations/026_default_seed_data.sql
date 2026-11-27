-- Default masterdata + staff users for JPAFLI FMCS.
-- Idempotent: safe to re-run against an existing database.

-- ---------------------------------------------------------------------------
-- Payment types
-- ---------------------------------------------------------------------------
INSERT INTO payment_types (name)
SELECT v.name
  FROM (VALUES ('Fuel'), ('Services'), ('Supplies'), ('Others')) AS v(name)
 WHERE NOT EXISTS (
   SELECT 1 FROM payment_types t WHERE lower(t.name) = lower(v.name)
 );

UPDATE payment_types
   SET active = TRUE, updated_at = now()
 WHERE lower(name) IN ('fuel', 'services', 'supplies', 'others');

UPDATE payment_types
   SET active = FALSE, updated_at = now()
 WHERE lower(name) NOT IN ('fuel', 'services', 'supplies', 'others');

-- ---------------------------------------------------------------------------
-- Payment formats (methods)
-- ---------------------------------------------------------------------------
INSERT INTO payment_methods (name, requires_reference)
SELECT v.name, v.requires_reference
  FROM (VALUES
    ('Bank Deposit', TRUE),
    ('Bank Transfer', TRUE),
    ('Cash', FALSE),
    ('Check', TRUE),
    ('Post Dated Check', TRUE),
    ('Online / E-Wallet', TRUE)
  ) AS v(name, requires_reference)
 WHERE NOT EXISTS (
   SELECT 1 FROM payment_methods m WHERE lower(m.name) = lower(v.name)
 );

UPDATE payment_methods m
   SET requires_reference = v.requires_reference,
       active = TRUE,
       updated_at = now()
  FROM (VALUES
    ('Bank Deposit', TRUE),
    ('Bank Transfer', TRUE),
    ('Cash', FALSE),
    ('Check', TRUE),
    ('Post Dated Check', TRUE),
    ('Online / E-Wallet', TRUE)
  ) AS v(name, requires_reference)
 WHERE lower(m.name) = lower(v.name);

UPDATE payment_methods
   SET active = FALSE, updated_at = now()
 WHERE lower(name) NOT IN (
   'bank deposit', 'bank transfer', 'cash', 'check', 'post dated check', 'online / e-wallet'
 );

-- ---------------------------------------------------------------------------
-- Payment terms
-- ---------------------------------------------------------------------------
INSERT INTO payment_terms (name, days)
SELECT v.name, v.days
  FROM (VALUES
    ('Immediate', 0),
    ('7', 7),
    ('15', 15),
    ('30', 30),
    ('45', 45),
    ('60', 60),
    ('90', 90)
  ) AS v(name, days)
 WHERE NOT EXISTS (
   SELECT 1 FROM payment_terms t WHERE lower(t.name) = lower(v.name)
 );

UPDATE payment_terms t
   SET days = v.days, active = TRUE, updated_at = now()
  FROM (VALUES
    ('Immediate', 0),
    ('7', 7),
    ('15', 15),
    ('30', 30),
    ('45', 45),
    ('60', 60),
    ('90', 90)
  ) AS v(name, days)
 WHERE lower(t.name) = lower(v.name);

UPDATE payment_terms
   SET active = FALSE, updated_at = now()
 WHERE lower(name) NOT IN ('immediate', '7', '15', '30', '45', '60', '90');

-- ---------------------------------------------------------------------------
-- Payable statuses (rename legacy → new workflow)
-- ---------------------------------------------------------------------------
UPDATE payable_statuses
   SET name = 'For review', category = 'open', color = '#b91c1c', sort_order = 10, active = TRUE, updated_at = now()
 WHERE lower(name) IN ('unpaid', 'for release', 'for review');

UPDATE payable_statuses
   SET name = 'Create Check for Deposit', category = 'open', color = '#1d4ed8', sort_order = 20, active = TRUE, updated_at = now()
 WHERE lower(name) IN ('scheduled', 'create check for deposit');

UPDATE payable_statuses
   SET name = 'Check Deposited', category = 'open', color = '#0d9488', sort_order = 40, active = TRUE, updated_at = now()
 WHERE lower(name) IN ('paid', 'deposited', 'check deposited');

UPDATE payable_statuses
   SET name = 'Cancelled', category = 'cancelled', color = '#4b5563', sort_order = 0, active = TRUE, updated_at = now()
 WHERE lower(name) = 'cancelled';

INSERT INTO payable_statuses (name, category, color, sort_order, active)
SELECT v.name, v.category, v.color, v.sort_order, TRUE
  FROM (VALUES
    ('For review', 'open', '#b91c1c', 10),
    ('Create Check for Deposit', 'open', '#1d4ed8', 20),
    ('Create Check for Release', 'open', '#7c3aed', 30),
    ('Check Deposited', 'open', '#0d9488', 40),
    ('Check Released', 'paid', '#047857', 50),
    ('Cancelled', 'cancelled', '#4b5563', 0),
    ('Rejected', 'cancelled', '#b91c1c', 0)
  ) AS v(name, category, color, sort_order)
 WHERE NOT EXISTS (
   SELECT 1 FROM payable_statuses s WHERE lower(s.name) = lower(v.name)
 );

UPDATE payable_statuses s
   SET category = v.category,
       color = v.color,
       sort_order = v.sort_order,
       active = TRUE,
       updated_at = now()
  FROM (VALUES
    ('For review', 'open', '#b91c1c', 10),
    ('Create Check for Deposit', 'open', '#1d4ed8', 20),
    ('Create Check for Release', 'open', '#7c3aed', 30),
    ('Check Deposited', 'open', '#0d9488', 40),
    ('Check Released', 'paid', '#047857', 50),
    ('Cancelled', 'cancelled', '#4b5563', 0),
    ('Rejected', 'cancelled', '#b91c1c', 0)
  ) AS v(name, category, color, sort_order)
 WHERE lower(s.name) = lower(v.name);

UPDATE payable_statuses
   SET active = FALSE, updated_at = now()
 WHERE lower(name) NOT IN (
   'for review',
   'create check for deposit',
   'create check for release',
   'check deposited',
   'check released',
   'cancelled',
   'rejected'
 );

-- ---------------------------------------------------------------------------
-- Receivable statuses
-- ---------------------------------------------------------------------------
INSERT INTO receivable_statuses (name, category, color, sort_order, active)
SELECT v.name, v.category, v.color, v.sort_order, TRUE
  FROM (VALUES
    ('Outstanding', 'open', '#b91c1c', 10),
    ('Expected', 'open', '#1d4ed8', 20),
    ('Collected', 'paid', '#047857', 30),
    ('Cancelled', 'cancelled', '#4b5563', 40)
  ) AS v(name, category, color, sort_order)
 WHERE NOT EXISTS (
   SELECT 1 FROM receivable_statuses s WHERE lower(s.name) = lower(v.name)
 );

UPDATE receivable_statuses s
   SET category = v.category,
       color = v.color,
       sort_order = v.sort_order,
       active = TRUE,
       updated_at = now()
  FROM (VALUES
    ('Outstanding', 'open', '#b91c1c', 10),
    ('Expected', 'open', '#1d4ed8', 20),
    ('Collected', 'paid', '#047857', 30),
    ('Cancelled', 'cancelled', '#4b5563', 40)
  ) AS v(name, category, color, sort_order)
 WHERE lower(s.name) = lower(v.name);

UPDATE receivable_statuses
   SET active = FALSE, updated_at = now()
 WHERE lower(name) NOT IN ('outstanding', 'expected', 'collected', 'cancelled');

-- ---------------------------------------------------------------------------
-- AR deduction descriptions
-- ---------------------------------------------------------------------------
INSERT INTO ar_deduction_descriptions (name, sort_order, active)
SELECT v.name, v.sort_order, TRUE
  FROM (VALUES
    ('Volume Discount', 10),
    ('Toll Fee', 20),
    ('Parking', 30),
    ('Other', 40)
  ) AS v(name, sort_order)
 WHERE NOT EXISTS (
   SELECT 1 FROM ar_deduction_descriptions d WHERE lower(trim(d.name)) = lower(trim(v.name))
 );

UPDATE ar_deduction_descriptions d
   SET sort_order = v.sort_order, active = TRUE, updated_at = now()
  FROM (VALUES
    ('Volume Discount', 10),
    ('Toll Fee', 20),
    ('Parking', 30),
    ('Other', 40)
  ) AS v(name, sort_order)
 WHERE lower(trim(d.name)) = lower(trim(v.name));

-- Normalize older labels
UPDATE ar_deduction_descriptions
   SET name = 'Toll Fee', sort_order = 20, active = TRUE, updated_at = now()
 WHERE lower(trim(name)) = 'toll fee' AND name <> 'Toll Fee';

UPDATE ar_deduction_descriptions
   SET active = FALSE, updated_at = now()
 WHERE lower(trim(name)) NOT IN ('volume discount', 'toll fee', 'parking', 'other');

-- ---------------------------------------------------------------------------
-- Staff users: Crissa Ortiz + Jeanette Matira
-- Passwords: mscrissa / msjeanette (bcrypt)
-- Default payable statuses are exclusive (one user per status) — see 027.
-- ---------------------------------------------------------------------------
INSERT INTO users (username, display_name, password_hash, role, active)
VALUES
  (
    'mscrissa',
    'Crissa Ortiz',
    '$2b$10$AQ7RaFNPLcUHt48NZ8WCdOXD/EXN8neDTxCEZhzZ0ygX0.6dYheLy',
    'staff',
    TRUE
  ),
  (
    'msjeanette',
    'Jeanette Matira',
    '$2b$10$F475UYhF2U483aLLa/xRg.OX/f.UgFGb.IepodQ79alVQ3FFg94Dm',
    'staff',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- Username unique index is on lower(username); use UPDATE for re-seed of display/password/role
UPDATE users
   SET display_name = 'Crissa Ortiz',
       password_hash = '$2b$10$AQ7RaFNPLcUHt48NZ8WCdOXD/EXN8neDTxCEZhzZ0ygX0.6dYheLy',
       role = 'staff',
       active = TRUE,
       updated_at = now()
 WHERE lower(username) = 'mscrissa';

UPDATE users
   SET display_name = 'Jeanette Matira',
       password_hash = '$2b$10$F475UYhF2U483aLLa/xRg.OX/f.UgFGb.IepodQ79alVQ3FFg94Dm',
       role = 'staff',
       active = TRUE,
       updated_at = now()
 WHERE lower(username) = 'msjeanette';

-- Ensure permission rows exist
INSERT INTO user_permissions (user_id)
SELECT u.id FROM users u
 WHERE lower(u.username) IN ('mscrissa', 'msjeanette')
ON CONFLICT (user_id) DO NOTHING;

-- Crissa: payables + AR
UPDATE user_permissions p
   SET payables_view = TRUE,
       payables_create = TRUE,
       payables_edit = TRUE,
       payables_delete = TRUE,
       payables_status = TRUE,
       payables_status_history = TRUE,
       upcoming_release = TRUE,
       suppliers = FALSE,
       ar_view = TRUE,
       ar_edit = TRUE,
       ar_clients_manage = TRUE,
       receivables_view = FALSE,
       receivables_create = FALSE,
       receivables_edit = FALSE,
       receivables_delete = FALSE,
       receivables_status = FALSE,
       upcoming_collection = FALSE,
       masterdata = FALSE,
       settings = FALSE,
       source_accounts = FALSE,
       liquidations_view = FALSE,
       liquidations_manage = FALSE,
       petty_cash_view = FALSE,
       petty_cash_manage = FALSE
  FROM users u
 WHERE p.user_id = u.id AND lower(u.username) = 'mscrissa';

-- Jeanette: payables only
UPDATE user_permissions p
   SET payables_view = TRUE,
       payables_create = TRUE,
       payables_edit = TRUE,
       payables_delete = TRUE,
       payables_status = TRUE,
       payables_status_history = TRUE,
       upcoming_release = TRUE,
       suppliers = FALSE,
       ar_view = FALSE,
       ar_edit = FALSE,
       ar_clients_manage = FALSE,
       receivables_view = FALSE,
       receivables_create = FALSE,
       receivables_edit = FALSE,
       receivables_delete = FALSE,
       receivables_status = FALSE,
       upcoming_collection = FALSE,
       masterdata = FALSE,
       settings = FALSE,
       source_accounts = FALSE,
       liquidations_view = FALSE,
       liquidations_manage = FALSE,
       petty_cash_view = FALSE,
       petty_cash_manage = FALSE
  FROM users u
 WHERE p.user_id = u.id AND lower(u.username) = 'msjeanette';

-- Default payable statuses (exclusive): Crissa only — Create Check for Deposit + Cancelled
DELETE FROM user_payable_default_statuses d
 USING users u
 WHERE d.user_id = u.id AND lower(u.username) IN ('mscrissa', 'msjeanette');

INSERT INTO user_payable_default_statuses (user_id, status_id)
SELECT u.id, s.id
  FROM users u
  CROSS JOIN payable_statuses s
 WHERE lower(u.username) = 'mscrissa'
   AND s.active
   AND lower(s.name) IN ('create check for deposit', 'cancelled')
ON CONFLICT DO NOTHING;
