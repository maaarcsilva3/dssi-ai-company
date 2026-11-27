-- Seed unpaid payables from UNPAID PAYABLES.xlsx (JPA Freight Logistics AP 2026).
-- Idempotent: replaces prior seed batch tagged in description.

-- Ensure 120-day payment term exists.
INSERT INTO payment_terms (name, days, active)
SELECT '120', 120, TRUE
 WHERE NOT EXISTS (SELECT 1 FROM payment_terms WHERE days = 120);

-- Ensure suppliers exist.
INSERT INTO clients (name)
SELECT v.name
  FROM (VALUES
    ('CALAMBA ISUPART CENTER INC.'),
    ('CARTRACK TECHNOLOGIES PHL. INC.'),
    ('COSTA LEONE OLIO TIRES & AUTO SUPPLIES'),
    ('CTSPHERE ENTERPRISES CORP.'),
    ('FRICTION MATERIALS CORPORATION'),
    ('GOODTREAD CORPORATION'),
    ('LCE INTEGRATED SALES CORP.'),
    ('SIR PATRICK SECURITY SERVICES'),
    ('SOUTHGATE EXPRESS MKTG., INC.'),
    ('TYRE OPTION ENTERPRISES')
  ) AS v(name)
 WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE lower(c.name) = lower(v.name));

-- Remove previous seed batch (cascades invoices/history).
DELETE FROM payables WHERE description = '[seed: unpaid payables]';

DO $$
DECLARE
  v_status_id INTEGER;
  v_method_id INTEGER;
  v_type_id INTEGER;
  v_term_id INTEGER;
  v_client_id INTEGER;
  v_payable_id INTEGER;
  r RECORD;
BEGIN
  SELECT id INTO v_status_id FROM payable_statuses
   WHERE active AND lower(name) = 'for review' ORDER BY id LIMIT 1;
  IF v_status_id IS NULL THEN
    RAISE EXCEPTION 'Missing payable status For review';
  END IF;
  SELECT id INTO v_method_id FROM payment_methods
   WHERE active AND lower(name) = 'check' ORDER BY id LIMIT 1;
  IF v_method_id IS NULL THEN
    RAISE EXCEPTION 'Missing payment method Check';
  END IF;

  -- 1. LCE INTEGRATED SALES CORP. / 13177
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('LCE INTEGRATED SALES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '13177', '2026-01-30'::date, '2026-05-01'::date,
    136895.00, 136895.00, false, 12, 0.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '13177', '2026-01-30'::date,
    136895.00, 0.00, 0.00, 136895.00,
    0, v_term_id, '2026-05-01'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 2. LCE INTEGRATED SALES CORP. / 13177
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('LCE INTEGRATED SALES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '13177', '2026-01-30'::date, '2026-05-31'::date,
    136895.00, 136895.00, false, 12, 0.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '13177 (2026-05-31)', '2026-01-30'::date,
    136895.00, 0.00, 0.00, 136895.00,
    0, v_term_id, '2026-05-31'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 3. LCE INTEGRATED SALES CORP. / 13313
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('LCE INTEGRATED SALES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '13313', '2026-02-05'::date, '2026-05-07'::date,
    174230.00, 174230.00, false, 12, 0.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '13313', '2026-02-05'::date,
    174230.00, 0.00, 0.00, 174230.00,
    0, v_term_id, '2026-05-07'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 4. LCE INTEGRATED SALES CORP. / 13313
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('LCE INTEGRATED SALES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '13313', '2026-02-05'::date, '2026-06-06'::date,
    174230.00, 174230.00, false, 12, 0.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '13313 (2026-06-06)', '2026-02-05'::date,
    174230.00, 0.00, 0.00, 174230.00,
    0, v_term_id, '2026-06-06'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 5. LCE INTEGRATED SALES CORP. / 13400
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('LCE INTEGRATED SALES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '13400', '2026-02-11'::date, '2026-05-13'::date,
    87500.00, 87500.00, false, 12, 0.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '13400', '2026-02-11'::date,
    87500.00, 0.00, 0.00, 87500.00,
    0, v_term_id, '2026-05-13'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 6. LCE INTEGRATED SALES CORP. / 13400
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('LCE INTEGRATED SALES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '13400', '2026-02-11'::date, '2026-06-12'::date,
    87500.00, 87500.00, false, 12, 0.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '13400 (2026-06-12)', '2026-02-11'::date,
    87500.00, 0.00, 0.00, 87500.00,
    0, v_term_id, '2026-06-12'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 7. TYRE OPTION ENTERPRISES / 2055
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2055', '2026-06-01'::date, '2026-10-29'::date,
    95142.86, 96000.00, true, 12, 10285.71,
    true, 'products', 1, 857.14,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2055', '2026-06-01'::date,
    96000.00, 10285.71, 857.14, 95142.86,
    0, v_term_id, '2026-10-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 8. TYRE OPTION ENTERPRISES / 2057
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2057', '2026-06-01'::date, '2026-10-29'::date,
    19028.57, 19200.00, true, 12, 2057.14,
    true, 'products', 1, 171.43,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2057', '2026-06-01'::date,
    19200.00, 2057.14, 171.43, 19028.57,
    0, v_term_id, '2026-10-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 9. TYRE OPTION ENTERPRISES / 2096
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2096', '2026-07-11'::date, '2026-11-08'::date,
    7333.93, 7400.00, true, 12, 792.86,
    true, 'products', 1, 66.07,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2096', '2026-07-11'::date,
    7400.00, 792.86, 66.07, 7333.93,
    0, v_term_id, '2026-11-08'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 10. TYRE OPTION ENTERPRISES / 2180
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2180', '2026-07-02'::date, '2026-10-30'::date,
    68383.93, 69000.00, true, 12, 7392.86,
    true, 'products', 1, 616.07,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2180', '2026-07-02'::date,
    69000.00, 7392.86, 616.07, 68383.93,
    0, v_term_id, '2026-10-30'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 11. FRICTION MATERIALS CORPORATION / 103989
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '103989', '2026-06-10'::date, '2026-09-15'::date,
    42473.36, 42856.00, true, 12, 4591.71,
    true, 'products', 1, 382.64,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '103989', '2026-06-10'::date,
    42856.00, 4591.71, 382.64, 42473.36,
    0, v_term_id, '2026-09-15'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 12. FRICTION MATERIALS CORPORATION / 104121
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '104121', '2026-06-15'::date, '2026-09-15'::date,
    32816.36, 33112.00, true, 12, 3547.71,
    true, 'products', 1, 295.64,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '104121', '2026-06-15'::date,
    33112.00, 3547.71, 295.64, 32816.36,
    0, v_term_id, '2026-09-15'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 13. TYRE OPTION ENTERPRISES / 2189
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2189', '2026-07-06'::date, '2026-11-03'::date,
    7135.71, 7200.00, true, 12, 771.43,
    true, 'products', 1, 64.29,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2189', '2026-07-06'::date,
    7200.00, 771.43, 64.29, 7135.71,
    0, v_term_id, '2026-11-03'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 14. TYRE OPTION ENTERPRISES / 2198
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2198', '2026-07-08'::date, '2026-11-05'::date,
    10703.57, 10800.00, true, 12, 1157.14,
    true, 'products', 1, 96.43,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2198', '2026-07-08'::date,
    10800.00, 1157.14, 96.43, 10703.57,
    0, v_term_id, '2026-11-05'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 15. CARTRACK TECHNOLOGIES PHL. INC. / 69062
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CARTRACK TECHNOLOGIES PHL. INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '69062', '2026-07-01'::date, '2026-07-01'::date,
    4032.00, 4032.00, true, 12, 432.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '69062', '2026-07-01'::date,
    4032.00, 432.00, 0.00, 4032.00,
    0, v_term_id, '2026-07-01'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 16. TYRE OPTION ENTERPRISES / 2247
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2247', '2026-07-20'::date, '2026-11-17'::date,
    66401.79, 67000.00, true, 12, 7178.57,
    true, 'products', 1, 598.21,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2247', '2026-07-20'::date,
    67000.00, 7178.57, 598.21, 66401.79,
    0, v_term_id, '2026-11-17'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 17. FRICTION MATERIALS CORPORATION / 104291
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '104291', '2026-06-24'::date, '2026-09-22'::date,
    24261.43, 24480.00, true, 12, 2622.86,
    true, 'products', 1, 218.57,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '104291', '2026-06-24'::date,
    24480.00, 2622.86, 218.57, 24261.43,
    0, v_term_id, '2026-09-22'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 18. FRICTION MATERIALS CORPORATION / 104608
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '104608', '2026-07-10'::date, '2026-10-08'::date,
    93018.00, 93856.00, true, 12, 10056.00,
    true, 'products', 1, 838.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '104608', '2026-07-10'::date,
    93856.00, 10056.00, 838.00, 93018.00,
    0, v_term_id, '2026-10-08'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 19. FRICTION MATERIALS CORPORATION / 104607
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '104607', '2026-07-10'::date, '2026-10-08'::date,
    12130.71, 12240.00, true, 12, 1311.43,
    true, 'products', 1, 109.29,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '104607', '2026-07-10'::date,
    12240.00, 1311.43, 109.29, 12130.71,
    0, v_term_id, '2026-10-08'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 20. CARTRACK TECHNOLOGIES PHL. INC. / 74138
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CARTRACK TECHNOLOGIES PHL. INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '74138', '2026-08-01'::date, '2026-08-01'::date,
    4032.00, 4032.00, true, 12, 432.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '74138', '2026-08-01'::date,
    4032.00, 432.00, 0.00, 4032.00,
    0, v_term_id, '2026-08-01'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 21. COSTA LEONE OLIO TIRES & AUTO SUPPLIES / 2646
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('COSTA LEONE OLIO TIRES & AUTO SUPPLIES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2646', '2026-08-05'::date, '2026-12-03'::date,
    64419.64, 65000.00, true, 12, 6964.29,
    true, 'products', 1, 580.36,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2646', '2026-08-05'::date,
    65000.00, 6964.29, 580.36, 64419.64,
    0, v_term_id, '2026-12-03'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 22. TYRE OPTION ENTERPRISES / 2287
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2287', '2026-08-01'::date, '2026-11-29'::date,
    32655.80, 32950.00, true, 12, 3530.36,
    true, 'products', 1, 294.20,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2287', '2026-08-01'::date,
    32950.00, 3530.36, 294.20, 32655.80,
    0, v_term_id, '2026-11-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 23. TYRE OPTION ENTERPRISES / 2309
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2309', '2026-08-05'::date, '2026-12-03'::date,
    65311.61, 65900.00, true, 12, 7060.71,
    true, 'products', 1, 588.39,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2309', '2026-08-05'::date,
    65900.00, 7060.71, 588.39, 65311.61,
    0, v_term_id, '2026-12-03'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 24. TYRE OPTION ENTERPRISES / 6262
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '6262', '2026-08-13'::date, '2026-12-11'::date,
    901.88, 910.00, true, 12, 97.50,
    true, 'products', 1, 8.13,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '6262', '2026-08-13'::date,
    910.00, 97.50, 8.13, 901.88,
    0, v_term_id, '2026-12-11'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 25. TYRE OPTION ENTERPRISES / 2333
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2333', '2026-08-13'::date, '2026-12-11'::date,
    10901.79, 11000.00, true, 12, 1178.57,
    true, 'products', 1, 98.21,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2333', '2026-08-13'::date,
    11000.00, 1178.57, 98.21, 10901.79,
    0, v_term_id, '2026-12-11'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 26. TYRE OPTION ENTERPRISES / 2355
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2355', '2026-08-18'::date, '2026-12-16'::date,
    70167.86, 70800.00, true, 12, 7585.71,
    true, 'products', 1, 632.14,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2355', '2026-08-18'::date,
    70800.00, 7585.71, 632.14, 70167.86,
    0, v_term_id, '2026-12-16'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 27. TYRE OPTION ENTERPRISES / 2365
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2365', '2026-08-22'::date, '2026-12-20'::date,
    34885.71, 35200.00, true, 12, 3771.43,
    true, 'products', 1, 314.29,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2365', '2026-08-22'::date,
    35200.00, 3771.43, 314.29, 34885.71,
    0, v_term_id, '2026-12-20'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 28. TYRE OPTION ENTERPRISES / 2375
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2375', '2026-08-26'::date, '2026-12-24'::date,
    69771.43, 70400.00, true, 12, 7542.86,
    true, 'products', 1, 628.57,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2375', '2026-08-26'::date,
    70400.00, 7542.86, 628.57, 69771.43,
    0, v_term_id, '2026-12-24'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 29. CTSPHERE ENTERPRISES CORP. / 4004
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CTSPHERE ENTERPRISES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '4004', '2026-08-21'::date, '2026-11-19'::date,
    86916.96, 87700.00, true, 12, 9396.43,
    true, 'products', 1, 783.04,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '4004', '2026-08-21'::date,
    87700.00, 9396.43, 783.04, 86916.96,
    0, v_term_id, '2026-11-19'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 30. CARTRACK TECHNOLOGIES PHL. INC. / 78866
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CARTRACK TECHNOLOGIES PHL. INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '78866', '2026-09-01'::date, '2026-09-01'::date,
    4032.00, 4032.00, true, 12, 432.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '78866', '2026-09-01'::date,
    4032.00, 432.00, 0.00, 4032.00,
    0, v_term_id, '2026-09-01'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 31. CALAMBA ISUPART CENTER INC. / 108363
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108363', '2026-09-02'::date, '2026-11-14'::date,
    73478.04, 74140.00, true, 12, 7943.57,
    true, 'products', 1, 661.96,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108363', '2026-09-02'::date,
    74140.00, 7943.57, 661.96, 73478.04,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 32. CALAMBA ISUPART CENTER INC. / 108364
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108364', '2026-09-02'::date, '2026-11-14'::date,
    792.86, 800.00, true, 12, 85.71,
    true, 'products', 1, 7.14,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108364', '2026-09-02'::date,
    800.00, 85.71, 7.14, 792.86,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 33. CALAMBA ISUPART CENTER INC. / 108365
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108365', '2026-09-03'::date, '2026-11-14'::date,
    47194.82, 47620.00, true, 12, 5102.14,
    true, 'products', 1, 425.18,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108365', '2026-09-03'::date,
    47620.00, 5102.14, 425.18, 47194.82,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 34. CALAMBA ISUPART CENTER INC. / 108366
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108366', '2026-09-05'::date, '2026-11-14'::date,
    40524.91, 40890.00, true, 12, 4381.07,
    true, 'products', 1, 365.09,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108366', '2026-09-05'::date,
    40890.00, 4381.07, 365.09, 40524.91,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 35. CALAMBA ISUPART CENTER INC. / 108367
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108367', '2026-09-07'::date, '2026-11-14'::date,
    22309.02, 22510.00, true, 12, 2411.79,
    true, 'products', 1, 200.98,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108367', '2026-09-07'::date,
    22510.00, 2411.79, 200.98, 22309.02,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 36. CALAMBA ISUPART CENTER INC. / 108368
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108368', '2026-09-07'::date, '2026-11-14'::date,
    10542.52, 10637.50, true, 12, 1139.73,
    true, 'products', 1, 94.98,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108368', '2026-09-07'::date,
    10637.50, 1139.73, 94.98, 10542.52,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 37. CALAMBA ISUPART CENTER INC. / 108370
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108370', '2026-09-08'::date, '2026-11-14'::date,
    22442.81, 22645.00, true, 12, 2426.25,
    true, 'products', 1, 202.19,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108370', '2026-09-08'::date,
    22645.00, 2426.25, 202.19, 22442.81,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 38. CALAMBA ISUPART CENTER INC. / 108371
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108371', '2026-09-10'::date, '2026-11-14'::date,
    80613.75, 81340.00, true, 12, 8715.00,
    true, 'products', 1, 726.25,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108371', '2026-09-10'::date,
    81340.00, 8715.00, 726.25, 80613.75,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 39. CALAMBA ISUPART CENTER INC. / 108372
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108372', '2026-09-10'::date, '2026-11-14'::date,
    44300.89, 44700.00, true, 12, 4789.29,
    true, 'products', 1, 399.11,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108372', '2026-09-10'::date,
    44700.00, 4789.29, 399.11, 44300.89,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 40. CALAMBA ISUPART CENTER INC. / 108373
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108373', '2026-09-10'::date, '2026-11-14'::date,
    21010.71, 21200.00, true, 12, 2271.43,
    true, 'products', 1, 189.29,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108373', '2026-09-10'::date,
    21200.00, 2271.43, 189.29, 21010.71,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 41. TYRE OPTION ENTERPRISES / 2400
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2400', '2026-09-03'::date, '2027-01-01'::date,
    69771.43, 70400.00, true, 12, 7542.86,
    true, 'products', 1, 628.57,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2400', '2026-09-03'::date,
    70400.00, 7542.86, 628.57, 69771.43,
    0, v_term_id, '2027-01-01'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 42. TYRE OPTION ENTERPRISES / 2418
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2418', '2026-09-07'::date, '2027-01-05'::date,
    104657.14, 105600.00, true, 12, 11314.29,
    true, 'products', 1, 942.86,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2418', '2026-09-07'::date,
    105600.00, 11314.29, 942.86, 104657.14,
    0, v_term_id, '2027-01-05'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 43. CTSPHERE ENTERPRISES CORP. / 4044
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CTSPHERE ENTERPRISES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '4044', '2026-08-29'::date, '2026-11-27'::date,
    173833.93, 175400.00, true, 12, 18792.86,
    true, 'products', 1, 1566.07,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '4044', '2026-08-29'::date,
    175400.00, 18792.86, 1566.07, 173833.93,
    0, v_term_id, '2026-11-27'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 44. CTSPHERE ENTERPRISES CORP. / 4076
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CTSPHERE ENTERPRISES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '4076', '2026-09-05'::date, '2026-12-04'::date,
    86916.96, 87700.00, true, 12, 9396.43,
    true, 'products', 1, 783.04,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '4076', '2026-09-05'::date,
    87700.00, 9396.43, 783.04, 86916.96,
    0, v_term_id, '2026-12-04'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 45. CTSPHERE ENTERPRISES CORP. / 4077
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CTSPHERE ENTERPRISES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '4077', '2026-09-05'::date, '2026-12-04'::date,
    28067.14, 28320.00, true, 12, 3034.29,
    true, 'products', 1, 252.86,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '4077', '2026-09-05'::date,
    28320.00, 3034.29, 252.86, 28067.14,
    0, v_term_id, '2026-12-04'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 46. FRICTION MATERIALS CORPORATION / 105065
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '105065', '2026-08-06'::date, '2026-11-04'::date,
    115713.54, 116756.00, true, 12, 12509.57,
    true, 'products', 1, 1042.46,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '105065', '2026-08-06'::date,
    116756.00, 12509.57, 1042.46, 115713.54,
    0, v_term_id, '2026-11-04'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 47. FRICTION MATERIALS CORPORATION / 105066
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '105066', '2026-08-06'::date, '2026-11-04'::date,
    6065.36, 6120.00, true, 12, 655.71,
    true, 'products', 1, 54.64,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '105066', '2026-08-06'::date,
    6120.00, 655.71, 54.64, 6065.36,
    0, v_term_id, '2026-11-04'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 48. GOODTREAD CORPORATION / 2514
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('GOODTREAD CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2514', '2026-09-02'::date, '2026-12-01'::date,
    105053.57, 106000.00, true, 12, 11357.14,
    true, 'products', 1, 946.43,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2514', '2026-09-02'::date,
    106000.00, 11357.14, 946.43, 105053.57,
    0, v_term_id, '2026-12-01'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 49. FRICTION MATERIALS CORPORATION / 103393
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '103393', '2026-04-29'::date, '2026-12-31'::date,
    6023.24, 6077.50, true, 12, 651.16,
    true, 'products', 1, 54.26,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '103393', '2026-04-29'::date,
    6077.50, 651.16, 54.26, 6023.24,
    0, v_term_id, '2026-12-31'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 50. FRICTION MATERIALS CORPORATION / 104226
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '104226', '2026-06-22'::date, '2026-12-31'::date,
    62017.29, 62576.00, true, 12, 6704.57,
    true, 'products', 1, 558.71,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '104226', '2026-06-22'::date,
    62576.00, 6704.57, 558.71, 62017.29,
    0, v_term_id, '2026-12-31'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 51. FRICTION MATERIALS CORPORATION / 104699
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '104699', '2026-07-16'::date, '2026-12-31'::date,
    65632.71, 66224.00, true, 12, 7095.43,
    true, 'products', 1, 591.29,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '104699', '2026-07-16'::date,
    66224.00, 7095.43, 591.29, 65632.71,
    0, v_term_id, '2026-12-31'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 52. CALAMBA ISUPART CENTER INC. / 108374
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108374', '2026-09-10'::date, '2026-11-14'::date,
    17442.86, 17600.00, true, 12, 1885.71,
    true, 'products', 1, 157.14,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108374', '2026-09-10'::date,
    17600.00, 1885.71, 157.14, 17442.86,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 53. CALAMBA ISUPART CENTER INC. / 108375
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108375', '2026-09-10'::date, '2026-11-14'::date,
    4895.89, 4940.00, true, 12, 529.29,
    true, 'products', 1, 44.11,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108375', '2026-09-10'::date,
    4940.00, 529.29, 44.11, 4895.89,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 54. CALAMBA ISUPART CENTER INC. / 108376
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108376', '2026-09-11'::date, '2026-11-14'::date,
    36174.11, 36500.00, true, 12, 3910.71,
    true, 'products', 1, 325.89,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108376', '2026-09-11'::date,
    36500.00, 3910.71, 325.89, 36174.11,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 55. CALAMBA ISUPART CENTER INC. / 108382
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108382', '2026-09-11'::date, '2026-11-14'::date,
    27750.00, 28000.00, true, 12, 3000.00,
    true, 'products', 1, 250.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108382', '2026-09-11'::date,
    28000.00, 3000.00, 250.00, 27750.00,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 56. CALAMBA ISUPART CENTER INC. / 108378
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108378', '2026-09-14'::date, '2026-11-14'::date,
    28146.43, 28400.00, true, 12, 3042.86,
    true, 'products', 1, 253.57,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108378', '2026-09-14'::date,
    28400.00, 3042.86, 253.57, 28146.43,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 57. CALAMBA ISUPART CENTER INC. / 108379
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108379', '2026-09-14'::date, '2026-11-14'::date,
    42333.62, 42715.00, true, 12, 4576.61,
    true, 'products', 1, 381.38,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108379', '2026-09-14'::date,
    42715.00, 4576.61, 381.38, 42333.62,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 58. CALAMBA ISUPART CENTER INC. / 108380
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108380', '2026-09-14'::date, '2026-11-14'::date,
    37264.29, 37600.00, true, 12, 4028.57,
    true, 'products', 1, 335.71,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108380', '2026-09-14'::date,
    37600.00, 4028.57, 335.71, 37264.29,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 59. CALAMBA ISUPART CENTER INC. / 108381
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108381', '2026-09-14'::date, '2026-11-14'::date,
    3171.43, 3200.00, true, 12, 342.86,
    true, 'products', 1, 28.57,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108381', '2026-09-14'::date,
    3200.00, 342.86, 28.57, 3171.43,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 60. CALAMBA ISUPART CENTER INC. / 108383
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108383', '2026-09-15'::date, '2026-11-14'::date,
    18235.71, 18400.00, true, 12, 1971.43,
    true, 'products', 1, 164.29,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108383', '2026-09-15'::date,
    18400.00, 1971.43, 164.29, 18235.71,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 61. CALAMBA ISUPART CENTER INC. / 108384
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108384', '2026-09-16'::date, '2026-11-14'::date,
    51139.29, 51600.00, true, 12, 5528.57,
    true, 'products', 1, 460.71,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108384', '2026-09-16'::date,
    51600.00, 5528.57, 460.71, 51139.29,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 62. CALAMBA ISUPART CENTER INC. / 108385
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108385', '2026-09-16'::date, '2026-11-14'::date,
    9960.27, 10050.00, true, 12, 1076.79,
    true, 'products', 1, 89.73,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108385', '2026-09-16'::date,
    10050.00, 1076.79, 89.73, 9960.27,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 63. CALAMBA ISUPART CENTER INC. / 108386
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108386', '2026-09-17'::date, '2026-11-14'::date,
    33845.09, 34150.00, true, 12, 3658.93,
    true, 'products', 1, 304.91,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108386', '2026-09-17'::date,
    34150.00, 3658.93, 304.91, 33845.09,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 64. CALAMBA ISUPART CENTER INC. / 108387
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108387', '2026-09-18'::date, '2026-11-14'::date,
    19028.57, 19200.00, true, 12, 2057.14,
    true, 'products', 1, 171.43,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108387', '2026-09-18'::date,
    19200.00, 2057.14, 171.43, 19028.57,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 65. CALAMBA ISUPART CENTER INC. / 108388
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108388', '2026-09-19'::date, '2026-11-14'::date,
    14965.18, 15100.00, true, 12, 1617.86,
    true, 'products', 1, 134.82,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108388', '2026-09-19'::date,
    15100.00, 1617.86, 134.82, 14965.18,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 66. CALAMBA ISUPART CENTER INC. / 108389
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108389', '2026-09-22'::date, '2026-11-14'::date,
    30128.57, 30400.00, true, 12, 3257.14,
    true, 'products', 1, 271.43,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108389', '2026-09-22'::date,
    30400.00, 3257.14, 271.43, 30128.57,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 67. CALAMBA ISUPART CENTER INC. / 108390
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108390', '2026-09-23'::date, '2026-11-14'::date,
    60356.25, 60900.00, true, 12, 6525.00,
    true, 'products', 1, 543.75,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108390', '2026-09-23'::date,
    60900.00, 6525.00, 543.75, 60356.25,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 68. CALAMBA ISUPART CENTER INC. / 108391
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108391', '2026-09-23'::date, '2026-11-14'::date,
    51951.96, 52420.00, true, 12, 5616.43,
    true, 'products', 1, 468.04,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108391', '2026-09-23'::date,
    52420.00, 5616.43, 468.04, 51951.96,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 69. CALAMBA ISUPART CENTER INC. / 108392
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108392', '2026-09-23'::date, '2026-11-14'::date,
    7076.25, 7140.00, true, 12, 765.00,
    true, 'products', 1, 63.75,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108392', '2026-09-23'::date,
    7140.00, 765.00, 63.75, 7076.25,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 70. CALAMBA ISUPART CENTER INC. / 108393
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108393', '2026-09-25'::date, '2026-11-14'::date,
    30188.04, 30460.00, true, 12, 3263.57,
    true, 'products', 1, 271.96,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108393', '2026-09-25'::date,
    30460.00, 3263.57, 271.96, 30188.04,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 71. CALAMBA ISUPART CENTER INC. / 108394
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108394', '2026-09-25'::date, '2026-11-14'::date,
    4757.14, 4800.00, true, 12, 514.29,
    true, 'products', 1, 42.86,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108394', '2026-09-25'::date,
    4800.00, 514.29, 42.86, 4757.14,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 72. CALAMBA ISUPART CENTER INC. / 108396
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108396', '2026-09-28'::date, '2026-11-14'::date,
    58770.54, 59300.00, true, 12, 6353.57,
    true, 'products', 1, 529.46,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108396', '2026-09-28'::date,
    59300.00, 6353.57, 529.46, 58770.54,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 73. CALAMBA ISUPART CENTER INC. / 108398
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108398', '2026-09-29'::date, '2026-11-14'::date,
    11496.43, 11600.00, true, 12, 1242.86,
    true, 'products', 1, 103.57,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108398', '2026-09-29'::date,
    11600.00, 1242.86, 103.57, 11496.43,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 74. CALAMBA ISUPART CENTER INC. / 108399
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108399', '2026-09-29'::date, '2026-11-14'::date,
    6441.96, 6500.00, true, 12, 696.43,
    true, 'products', 1, 58.04,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108399', '2026-09-29'::date,
    6500.00, 696.43, 58.04, 6441.96,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 75. FRICTION MATERIALS CORPORATION / 105737
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '105737', '2026-09-09'::date, '2026-12-08'::date,
    39817.29, 40176.00, true, 12, 4304.57,
    true, 'products', 1, 358.71,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '105737', '2026-09-09'::date,
    40176.00, 4304.57, 358.71, 39817.29,
    0, v_term_id, '2026-12-08'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 76. FRICTION MATERIALS CORPORATION / 105753
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '105753', '2026-09-09'::date, '2026-12-08'::date,
    24261.43, 24480.00, true, 12, 2622.86,
    true, 'products', 1, 218.57,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '105753', '2026-09-09'::date,
    24480.00, 2622.86, 218.57, 24261.43,
    0, v_term_id, '2026-12-08'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 77. TYRE OPTION ENTERPRISES / 2458
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2458', '2026-09-19'::date, '2027-01-17'::date,
    69771.43, 70400.00, true, 12, 7542.86,
    true, 'products', 1, 628.57,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2458', '2026-09-19'::date,
    70400.00, 7542.86, 628.57, 69771.43,
    0, v_term_id, '2027-01-17'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 78. CTSPHERE ENTERPRISES CORP. / 4163
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CTSPHERE ENTERPRISES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '4163', '2026-09-22'::date, '2026-12-21'::date,
    130375.45, 131550.00, true, 12, 14094.64,
    true, 'products', 1, 1174.55,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '4163', '2026-09-22'::date,
    131550.00, 14094.64, 1174.55, 130375.45,
    0, v_term_id, '2026-12-21'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 79. CTSPHERE ENTERPRISES CORP. / 4195
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CTSPHERE ENTERPRISES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '4195', '2026-09-30'::date, '2026-12-30'::date,
    170365.18, 171900.00, true, 12, 18417.86,
    true, 'products', 1, 1534.82,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '4195', '2026-09-30'::date,
    171900.00, 18417.86, 1534.82, 170365.18,
    0, v_term_id, '2026-12-30'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 80. CTSPHERE ENTERPRISES CORP. / 4196
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CTSPHERE ENTERPRISES CORP.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '4196', '2026-09-30'::date, '2026-12-30'::date,
    42591.29, 42975.00, true, 12, 4604.46,
    true, 'products', 1, 383.71,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '4196', '2026-09-30'::date,
    42975.00, 4604.46, 383.71, 42591.29,
    0, v_term_id, '2026-12-30'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 81. GOODTREAD CORPORATION / 2553
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('GOODTREAD CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2553', '2026-09-22'::date, '2026-12-21'::date,
    55500.00, 56000.00, true, 12, 6000.00,
    true, 'products', 1, 500.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2553', '2026-09-22'::date,
    56000.00, 6000.00, 500.00, 55500.00,
    0, v_term_id, '2026-12-21'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 82. SOUTHGATE EXPRESS MKTG., INC. / 33641
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('SOUTHGATE EXPRESS MKTG., INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 60 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '33641', '2026-09-07'::date, '2026-11-07'::date,
    152228.57, 153600.00, true, 12, 16457.14,
    true, 'products', 1, 1371.43,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '33641', '2026-09-07'::date,
    153600.00, 16457.14, 1371.43, 152228.57,
    0, v_term_id, '2026-11-07'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 83. SOUTHGATE EXPRESS MKTG., INC. / 33677
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('SOUTHGATE EXPRESS MKTG., INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 60 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '33677', '2026-09-14'::date, '2026-11-14'::date,
    1014857.14, 1024000.00, true, 12, 109714.29,
    true, 'products', 1, 9142.86,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '33677', '2026-09-14'::date,
    1024000.00, 109714.29, 9142.86, 1014857.14,
    0, v_term_id, '2026-11-14'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 84. SOUTHGATE EXPRESS MKTG., INC. / 33785
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('SOUTHGATE EXPRESS MKTG., INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 60 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '33785', '2026-09-30'::date, '2026-11-30'::date,
    1348650.00, 1360800.00, true, 12, 145800.00,
    true, 'products', 1, 12150.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '33785', '2026-09-30'::date,
    1360800.00, 145800.00, 12150.00, 1348650.00,
    0, v_term_id, '2026-11-30'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 85. CARTRACK TECHNOLOGIES PHL. INC. / 83902
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CARTRACK TECHNOLOGIES PHL. INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '83902', '2026-10-01'::date, '2026-10-01'::date,
    4032.00, 4032.00, true, 12, 432.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '83902', '2026-10-01'::date,
    4032.00, 432.00, 0.00, 4032.00,
    0, v_term_id, '2026-10-01'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 86. CARTRACK TECHNOLOGIES PHL. INC. / 86185
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CARTRACK TECHNOLOGIES PHL. INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '86185', '2026-10-08'::date, '2026-10-08'::date,
    603.68, 603.68, true, 12, 64.68,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '86185', '2026-10-08'::date,
    603.68, 64.68, 0.00, 603.68,
    0, v_term_id, '2026-10-08'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 87. CARTRACK TECHNOLOGIES PHL. INC. / 86322
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CARTRACK TECHNOLOGIES PHL. INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '86322', '2026-10-12'::date, '2026-10-12'::date,
    254.80, 254.80, true, 12, 27.30,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '86322', '2026-10-12'::date,
    254.80, 27.30, 0.00, 254.80,
    0, v_term_id, '2026-10-12'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 88. CALAMBA ISUPART CENTER INC. / 108400
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '108400', '2026-10-02'::date, '2000-01-29'::date,
    65807.14, 66400.00, true, 12, 7114.29,
    true, 'products', 1, 592.86,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '108400', '2026-10-02'::date,
    66400.00, 7114.29, 592.86, 65807.14,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 89. CALAMBA ISUPART CENTER INC. / 109751
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109751', '2026-10-02'::date, '2000-01-29'::date,
    53180.89, 53660.00, true, 12, 5749.29,
    true, 'products', 1, 479.11,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109751', '2026-10-02'::date,
    53660.00, 5749.29, 479.11, 53180.89,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 90. CALAMBA ISUPART CENTER INC. / 109752
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109752', '2026-10-07'::date, '2000-01-29'::date,
    42918.35, 43305.00, true, 12, 4639.82,
    true, 'products', 1, 386.65,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109752', '2026-10-07'::date,
    43305.00, 4639.82, 386.65, 42918.35,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 91. CALAMBA ISUPART CENTER INC. / 109753
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109753', '2026-10-07'::date, '2000-01-29'::date,
    47075.89, 47500.00, true, 12, 5089.29,
    true, 'products', 1, 424.11,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109753', '2026-10-07'::date,
    47500.00, 5089.29, 424.11, 47075.89,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 92. CALAMBA ISUPART CENTER INC. / 109754
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109754', '2026-10-07'::date, '2000-01-29'::date,
    11100.00, 11200.00, true, 12, 1200.00,
    true, 'products', 1, 100.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109754', '2026-10-07'::date,
    11200.00, 1200.00, 100.00, 11100.00,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 93. CALAMBA ISUPART CENTER INC. / 109755
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109755', '2026-10-07'::date, '2000-01-29'::date,
    8325.00, 8400.00, true, 12, 900.00,
    true, 'products', 1, 75.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109755', '2026-10-07'::date,
    8400.00, 900.00, 75.00, 8325.00,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 94. CALAMBA ISUPART CENTER INC. / 109756
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109756', '2026-10-07'::date, '2000-01-29'::date,
    16650.00, 16800.00, true, 12, 1800.00,
    true, 'products', 1, 150.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109756', '2026-10-07'::date,
    16800.00, 1800.00, 150.00, 16650.00,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 95. CALAMBA ISUPART CENTER INC. / 109757
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109757', '2026-10-09'::date, '2000-01-29'::date,
    41902.50, 42280.00, true, 12, 4530.00,
    true, 'products', 1, 377.50,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109757', '2026-10-09'::date,
    42280.00, 4530.00, 377.50, 41902.50,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 96. CALAMBA ISUPART CENTER INC. / 109758
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109758', '2026-10-12'::date, '2000-01-29'::date,
    61922.14, 62480.00, true, 12, 6694.29,
    true, 'products', 1, 557.86,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109758', '2026-10-12'::date,
    62480.00, 6694.29, 557.86, 61922.14,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 97. CALAMBA ISUPART CENTER INC. / 109759
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109759', '2026-10-13'::date, '2000-01-29'::date,
    8047.50, 8120.00, true, 12, 870.00,
    true, 'products', 1, 72.50,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109759', '2026-10-13'::date,
    8120.00, 870.00, 72.50, 8047.50,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 98. CALAMBA ISUPART CENTER INC. / 109760
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109760', '2026-10-14'::date, '2000-01-29'::date,
    44063.04, 44460.00, true, 12, 4763.57,
    true, 'products', 1, 396.96,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109760', '2026-10-14'::date,
    44460.00, 4763.57, 396.96, 44063.04,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 99. CALAMBA ISUPART CENTER INC. / 109761
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109761', '2026-10-14'::date, '2000-01-29'::date,
    39454.55, 39810.00, true, 12, 4265.36,
    true, 'products', 1, 355.45,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109761', '2026-10-14'::date,
    39810.00, 4265.36, 355.45, 39454.55,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 100. CALAMBA ISUPART CENTER INC. / 109762
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109762', '2026-10-14'::date, '2000-01-29'::date,
    2378.57, 2400.00, true, 12, 257.14,
    true, 'products', 1, 21.43,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109762', '2026-10-14'::date,
    2400.00, 257.14, 21.43, 2378.57,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 101. CALAMBA ISUPART CENTER INC. / 109763
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109763', '2026-10-14'::date, '2000-01-29'::date,
    3766.07, 3800.00, true, 12, 407.14,
    true, 'products', 1, 33.93,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109763', '2026-10-14'::date,
    3800.00, 407.14, 33.93, 3766.07,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 102. CALAMBA ISUPART CENTER INC. / 110272
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '110272', '2026-10-16'::date, '2000-01-29'::date,
    25133.57, 25360.00, true, 12, 2717.14,
    true, 'products', 1, 226.43,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '110272', '2026-10-16'::date,
    25360.00, 2717.14, 226.43, 25133.57,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 103. CALAMBA ISUPART CENTER INC. / 109765
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109765', '2016-10-17'::date, '2000-01-29'::date,
    19920.54, 20100.00, true, 12, 2153.57,
    true, 'products', 1, 179.46,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109765', '2016-10-17'::date,
    20100.00, 2153.57, 179.46, 19920.54,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 104. CALAMBA ISUPART CENTER INC. / 109766
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109766', '2026-10-21'::date, '2000-01-29'::date,
    46218.62, 46635.00, true, 12, 4996.61,
    true, 'products', 1, 416.38,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109766', '2026-10-21'::date,
    46635.00, 4996.61, 416.38, 46218.62,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 105. CALAMBA ISUPART CENTER INC. / 109767
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109767', '2026-10-21'::date, '2000-01-29'::date,
    11298.21, 11400.00, true, 12, 1221.43,
    true, 'products', 1, 101.79,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109767', '2026-10-21'::date,
    11400.00, 1221.43, 101.79, 11298.21,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 106. CALAMBA ISUPART CENTER INC. / 109768
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CALAMBA ISUPART CENTER INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 30 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '109768', '2026-10-23'::date, '2000-01-29'::date,
    27861.00, 28112.00, true, 12, 3012.00,
    true, 'products', 1, 251.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '109768', '2026-10-23'::date,
    28112.00, 3012.00, 251.00, 27861.00,
    0, v_term_id, '2000-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 107. TYRE OPTION ENTERPRISES / 10
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '10', '2026-10-01'::date, '2027-01-29'::date,
    104657.14, 105600.00, true, 12, 11314.29,
    true, 'products', 1, 942.86,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '10', '2026-10-01'::date,
    105600.00, 11314.29, 942.86, 104657.14,
    0, v_term_id, '2027-01-29'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 108. TYRE OPTION ENTERPRISES / 37
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '37', '2026-10-09'::date, '2027-02-06'::date,
    69771.43, 70400.00, true, 12, 7542.86,
    true, 'products', 1, 628.57,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '37', '2026-10-09'::date,
    70400.00, 7542.86, 628.57, 69771.43,
    0, v_term_id, '2027-02-06'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 109. TYRE OPTION ENTERPRISES / 38
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '38', '2026-10-09'::date, '2027-02-06'::date,
    34885.71, 35200.00, true, 12, 3771.43,
    true, 'products', 1, 314.29,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '38', '2026-10-09'::date,
    35200.00, 3771.43, 314.29, 34885.71,
    0, v_term_id, '2027-02-06'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 110. GOODTREAD CORPORATION / 3963
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('GOODTREAD CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '3963', '2026-10-07'::date, '2027-01-05'::date,
    105053.57, 106000.00, true, 12, 11357.14,
    true, 'products', 1, 946.43,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '3963', '2026-10-07'::date,
    106000.00, 11357.14, 946.43, 105053.57,
    0, v_term_id, '2027-01-05'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 111. SOUTHGATE EXPRESS MKTG., INC. / 33893
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('SOUTHGATE EXPRESS MKTG., INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 60 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '33893', '2026-10-24'::date, '2026-12-25'::date,
    1248750.00, 1260000.00, true, 12, 135000.00,
    true, 'products', 1, 11250.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '33893', '2026-10-24'::date,
    1260000.00, 135000.00, 11250.00, 1248750.00,
    0, v_term_id, '2026-12-25'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 112. FRICTION MATERIALS CORPORATION / 106510
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '106510', '2026-10-19'::date, '2027-01-17'::date,
    210157.09, 212050.40, true, 12, 22719.69,
    true, 'products', 1, 1893.31,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '106510', '2026-10-19'::date,
    212050.40, 22719.69, 1893.31, 210157.09,
    0, v_term_id, '2027-01-17'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 113. FRICTION MATERIALS CORPORATION / 106511
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('FRICTION MATERIALS CORPORATION') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 90 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '106511', '2026-10-19'::date, '2027-01-17'::date,
    24229.71, 24448.00, true, 12, 2619.43,
    true, 'products', 1, 218.29,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '106511', '2026-10-19'::date,
    24448.00, 2619.43, 218.29, 24229.71,
    0, v_term_id, '2027-01-17'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 114. TYRE OPTION ENTERPRISES / 79
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '79', '2026-10-20'::date, '2027-02-17'::date,
    103722.70, 104657.14, true, 12, 11213.27,
    true, 'products', 1, 934.44,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '79', '2026-10-20'::date,
    104657.14, 11213.27, 934.44, 103722.70,
    0, v_term_id, '2027-02-17'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 115. CARTRACK TECHNOLOGIES PHL. INC. / 87286
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CARTRACK TECHNOLOGIES PHL. INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '87286', '2026-10-30'::date, '2026-10-30'::date,
    47.04, 47.04, true, 12, 5.04,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '87286', '2026-10-30'::date,
    47.04, 5.04, 0.00, 47.04,
    0, v_term_id, '2026-10-30'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 116. TYRE OPTION ENTERPRISES / 2430
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('TYRE OPTION ENTERPRISES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Supplies') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 120 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '2430', '2026-09-11'::date, '2027-01-09'::date,
    237857.14, 240000.00, true, 12, 25714.29,
    true, 'products', 1, 2142.86,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '2430', '2026-09-11'::date,
    240000.00, 25714.29, 2142.86, 237857.14,
    0, v_term_id, '2027-01-09'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 117. CARTRACK TECHNOLOGIES PHL. INC. / 87617
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CARTRACK TECHNOLOGIES PHL. INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '87617', '2026-11-01'::date, '2026-11-01'::date,
    92232.00, 92232.00, true, 12, 9882.00,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '87617', '2026-11-01'::date,
    92232.00, 9882.00, 0.00, 92232.00,
    0, v_term_id, '2026-11-01'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 118. CARTRACK TECHNOLOGIES PHL. INC. / 91027
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('CARTRACK TECHNOLOGIES PHL. INC.') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '91027', '2026-11-07'::date, '2026-11-07'::date,
    627.20, 627.20, true, 12, 67.20,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '91027', '2026-11-07'::date,
    627.20, 67.20, 0.00, 627.20,
    0, v_term_id, '2026-11-07'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 119. SIR PATRICK SECURITY SERVICES / 11175
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('SIR PATRICK SECURITY SERVICES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '11175', '2026-10-15'::date, '2026-10-15'::date,
    97527.92, 97527.92, true, 12, 10449.42,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '11175', '2026-10-15'::date,
    97527.92, 10449.42, 0.00, 97527.92,
    0, v_term_id, '2026-10-15'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

  -- 120. SIR PATRICK SECURITY SERVICES / 11176
  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower('SIR PATRICK SECURITY SERVICES') LIMIT 1;
  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower('Services') LIMIT 1;
  SELECT id INTO v_term_id FROM payment_terms WHERE days = 0 AND active ORDER BY id LIMIT 1;
  INSERT INTO payables (
    client_id, payment_type_id, payment_method_id, payment_term_id,
    invoice_no, invoice_date, due_date,
    amount, gross_amount, apply_vat, vat_rate, vat_amount,
    apply_ewt, ewt_kind, ewt_rate, ewt_amount,
    description, status_id, is_draft
  ) VALUES (
    v_client_id, v_type_id, v_method_id, v_term_id,
    '11176', '2026-10-31'::date, '2026-10-31'::date,
    101188.02, 101188.02, true, 12, 10841.57,
    false, NULL, NULL, 0.00,
    '[seed: unpaid payables]', v_status_id, FALSE
  ) RETURNING id INTO v_payable_id;
  INSERT INTO payable_invoices (
    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,
    sort_order, payment_term_id, due_date
  ) VALUES (
    v_payable_id, '11176', '2026-10-31'::date,
    101188.02, 10841.57, 0.00, 101188.02,
    0, v_term_id, '2026-10-31'::date
  );
  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)
  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');

END $$;
