-- Seed AR unpaid invoices from seeds/ar-unpaid-invoices.xlsx
-- (Accounts Receivable - Unpaid Invoices). Idempotent: replaces prior seed batch.
-- Each invoice gets one billing detail line (same fields as Add detail line).
-- Regenerate: node scripts/generate-ar-unpaid-seed-sql.mjs

-- Ensure clients exist.
INSERT INTO ar_clients (name, active)
SELECT v.name, TRUE
  FROM (VALUES
    ('CA LOGISTICS CORPORATION'),
    ('DECOARTS MARKETING, INC.'),
    ('DHL SUMMIT SOLUTIONS INC.'),
    ('DIZON FARMS PRODUCE INC.'),
    ('SCOMMERCE PHILIPPINES,INC.'),
    ('SPX PHILIPPINES, INC.'),
    ('SUNNYPHIL INCORPORATED'),
    ('WALL STREET COURIER SERVICES INC.')
  ) AS v(name)
 WHERE NOT EXISTS (
   SELECT 1 FROM ar_clients c WHERE lower(trim(c.name)) = lower(trim(v.name))
 );

-- Remove prior seed batch for these invoice numbers (cascades details/deductions).
DELETE FROM ar_summaries
 WHERE lower(trim(invoice_no)) IN (
   lower(trim('1019')),
   lower(trim('1020')),
   lower(trim('1036')),
   lower(trim('1544')),
   lower(trim('1656')),
   lower(trim('1665')),
   lower(trim('1685')),
   lower(trim('1699')),
   lower(trim('1700')),
   lower(trim('1723')),
   lower(trim('1737')),
   lower(trim('1742')),
   lower(trim('1749')),
   lower(trim('1754')),
   lower(trim('1756')),
   lower(trim('1794')),
   lower(trim('1795')),
   lower(trim('1796')),
   lower(trim('1798')),
   lower(trim('1807')),
   lower(trim('1808')),
   lower(trim('1809')),
   lower(trim('1810')),
   lower(trim('1812')),
   lower(trim('1823')),
   lower(trim('1824')),
   lower(trim('1825')),
   lower(trim('1826')),
   lower(trim('1827')),
   lower(trim('1828')),
   lower(trim('1829')),
   lower(trim('1830')),
   lower(trim('1831')),
   lower(trim('1832')),
   lower(trim('1834')),
   lower(trim('1835')),
   lower(trim('1836')),
   lower(trim('1837')),
   lower(trim('1860')),
   lower(trim('1868')),
   lower(trim('1869')),
   lower(trim('1870')),
   lower(trim('1871')),
   lower(trim('1872')),
   lower(trim('1873')),
   lower(trim('1874')),
   lower(trim('1875')),
   lower(trim('1876')),
   lower(trim('1877')),
   lower(trim('1878')),
   lower(trim('1879')),
   lower(trim('1880')),
   lower(trim('1881')),
   lower(trim('1883')),
   lower(trim('1884')),
   lower(trim('1885')),
   lower(trim('1886')),
   lower(trim('1887')),
   lower(trim('1888')),
   lower(trim('1889')),
   lower(trim('1890')),
   lower(trim('1891')),
   lower(trim('1892')),
   lower(trim('1893')),
   lower(trim('1894')),
   lower(trim('1895')),
   lower(trim('1896')),
   lower(trim('1901')),
   lower(trim('1904')),
   lower(trim('1905')),
   lower(trim('1906')),
   lower(trim('1907')),
   lower(trim('1908')),
   lower(trim('1909')),
   lower(trim('1910'))
 );

DO $$
DECLARE
  v_client_id INTEGER;
  v_summary_id INTEGER;
BEGIN

  -- Invoice 1019 · DHL SUMMIT SOLUTIONS INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('DHL SUMMIT SOLUTIONS INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'DHL SUMMIT SOLUTIONS INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1019', v_client_id, 'OCTOBER 16-NOVEMBER 21, 2025',
    NULL, NULL,
    '2026-01-27'::date, '2026-02-26'::date,
    'unpaid', NULL, 'pending',
    17618.00, 2114.16, 19732.16, 352.36,
    19379.80, 0.00, 19379.80
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1019', '2026-01-27'::date,
    '2026-01-27'::date, '2026-01-27'::date,
    '[seed: ar unpaid] HAULING SERVICES|BOOKING NO. 2126715', 'N/A', 'N/A', 19732.16
  );

  -- Invoice 1020 · DHL SUMMIT SOLUTIONS INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('DHL SUMMIT SOLUTIONS INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'DHL SUMMIT SOLUTIONS INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1020', v_client_id, 'OCTOBER 16-OCTOBER 31, 2025',
    NULL, NULL,
    '2026-01-28'::date, '2026-02-27'::date,
    'unpaid', NULL, 'pending',
    50784.40, 6094.13, 56878.53, 1015.69,
    55862.84, 0.00, 55862.84
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1020', '2026-01-28'::date,
    '2026-01-28'::date, '2026-01-28'::date,
    '[seed: ar unpaid] HAULING SERVICES|BOOKING NO. 2126562', 'N/A', 'N/A', 56878.53
  );

  -- Invoice 1036 · DHL SUMMIT SOLUTIONS INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('DHL SUMMIT SOLUTIONS INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'DHL SUMMIT SOLUTIONS INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1036', v_client_id, '2026-02-24',
    '2026-02-24'::date, '2026-02-24'::date,
    '2026-02-24'::date, '2026-03-26'::date,
    'unpaid', NULL, 'pending',
    17100.00, 2052.00, 19152.00, 342.00,
    18810.00, 0.00, 18810.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1036', '2026-02-24'::date,
    '2026-02-24'::date, '2026-02-24'::date,
    '[seed: ar unpaid] HAULING SERVICES|BOOKING NO. 2127945', 'N/A', 'N/A', 19152.00
  );

  -- Invoice 1544 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1544', v_client_id, 'JULY 18-24, 2026',
    NULL, NULL,
    '2026-07-30'::date, '2026-08-29'::date,
    'unpaid', NULL, 'pending',
    965207.13, 115824.86, 1081031.99, 19304.14,
    1061727.85, 0.00, 1061727.85
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1544', '2026-07-30'::date,
    '2026-07-30'::date, '2026-07-30'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHT', 'N/A', 'N/A', 1081031.99
  );

  -- Invoice 1656 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1656', v_client_id, '2026-08-02',
    '2026-08-02'::date, '2026-08-02'::date,
    '2026-08-07'::date, '2026-09-06'::date,
    'unpaid', NULL, 'pending',
    8500.00, 1020.00, 9520.00, 170.00,
    9350.00, 0.00, 9350.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1656', '2026-08-07'::date,
    '2026-08-07'::date, '2026-08-07'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHMGDS', 'N/A', 'N/A', 9520.00
  );

  -- Invoice 1665 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1665', v_client_id, '2026-08-09',
    '2026-08-09'::date, '2026-08-09'::date,
    '2026-08-12'::date, '2026-09-11'::date,
    'unpaid', NULL, 'pending',
    18250.00, 2190.00, 20440.00, 365.00,
    20075.00, 0.00, 20075.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1665', '2026-08-12'::date,
    '2026-08-12'::date, '2026-08-12'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHCADS, PHMGDS', 'N/A', 'N/A', 20440.00
  );

  -- Invoice 1685 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1685', v_client_id, 'AUGUST 13-16, 2026',
    NULL, NULL,
    '2026-08-26'::date, '2026-09-25'::date,
    'unpaid', NULL, 'pending',
    43250.00, 5190.00, 48440.00, 865.00,
    47575.00, 0.00, 47575.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1685', '2026-08-26'::date,
    '2026-08-26'::date, '2026-08-26'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHM7DS, PHMGDS, PHARDS, PHSJDS, PHCADS', 'N/A', 'N/A', 48440.00
  );

  -- Invoice 1699 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1699', v_client_id, 'AUGUST 21-23, 2026',
    NULL, NULL,
    '2026-09-07'::date, '2026-10-07'::date,
    'unpaid', NULL, 'pending',
    37250.00, 4470.00, 41720.00, 745.00,
    40975.00, 0.00, 40975.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1699', '2026-09-07'::date,
    '2026-09-07'::date, '2026-09-07'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHCADS, PHSJDS, PHARDS, PHM8DS', 'N/A', 'N/A', 41720.00
  );

  -- Invoice 1700 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1700', v_client_id, 'AUGUST 28-29, 2026',
    NULL, NULL,
    '2026-09-08'::date, '2026-10-08'::date,
    'unpaid', NULL, 'pending',
    24000.00, 2880.00, 26880.00, 480.00,
    26400.00, 0.00, 26400.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1700', '2026-09-08'::date,
    '2026-09-08'::date, '2026-09-08'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHMGDS, PHARDS, PHM7DS', 'N/A', 'N/A', 26880.00
  );

  -- Invoice 1723 · DECOARTS MARKETING, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('DECOARTS MARKETING, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'DECOARTS MARKETING, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1723', v_client_id, 'AUGUST 25,-SEPTEMBER 1, 2026',
    NULL, NULL,
    '2026-09-02'::date, '2026-09-29'::date,
    'unpaid', NULL, 'submitted',
    4592562.50, 551107.50, 5143670.00, 91851.25,
    5051818.75, 0.00, 5051818.75
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1723', '2026-09-02'::date,
    '2026-09-02'::date, '2026-09-08'::date,
    '[seed: ar unpaid] HAULING SERVICES|ORIGIN: CARMEN/SASA DISTRIBUTION', 'N/A', 'N/A', 5143670.00
  );

  -- Invoice 1737 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1737', v_client_id, 'AUGUST 1-15, 2026',
    NULL, NULL,
    '2026-09-14'::date, '2026-10-14'::date,
    'unpaid', NULL, 'pending',
    20805.00, 2496.60, 23301.60, 416.10,
    22885.50, 0.00, 22885.50
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1737', '2026-09-14'::date,
    '2026-09-14'::date, '2026-09-14'::date,
    '[seed: ar unpaid] HAULING SERVICES|TOLL FEE REIMBURSEMENT CTRL#2102', 'N/A', 'N/A', 23301.60
  );

  -- Invoice 1742 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1742', v_client_id, '2026-09-03',
    '2026-09-03'::date, '2026-09-03'::date,
    '2026-09-21'::date, '2026-10-21'::date,
    'unpaid', NULL, 'pending',
    9000.00, 1080.00, 10080.00, 180.00,
    9900.00, 0.00, 9900.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1742', '2026-09-21'::date,
    '2026-09-21'::date, '2026-09-21'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE:  PHARDS|JPA-W2W-GA-SEP-002|CODE: SCM-MT-01', 'N/A', 'N/A', 10080.00
  );

  -- Invoice 1749 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1749', v_client_id, 'September 15-18, 2026',
    NULL, NULL,
    '2026-09-28'::date, '2026-10-28'::date,
    'unpaid', NULL, 'pending',
    1048464.29, 125815.71, 1174280.00, 20969.29,
    1153310.71, 0.00, 1153310.71
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1749', '2026-09-28'::date,
    '2026-09-28'::date, '2026-09-28'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHT, PHCEB1, PHDVO1|JPA-W2W-GC-SEP-003|CODE: SCM-MT-01', 'N/A', 'N/A', 1174280.00
  );

  -- Invoice 1754 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1754', v_client_id, 'SEPTEMBER 02-03, 2026',
    NULL, NULL,
    '2026-09-09'::date, '2026-10-09'::date,
    'unpaid', NULL, 'pending',
    436781.83, 52413.82, 489195.65, 8735.64,
    480460.01, 0.00, 480460.01
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1754', '2026-09-09'::date,
    '2026-09-09'::date, '2026-09-09'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHM, PHP', 'N/A', 'N/A', 489195.65
  );

  -- Invoice 1756 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1756', v_client_id, 'SEPTEMBER 03-12, 2026',
    NULL, NULL,
    '2026-09-14'::date, '2026-10-14'::date,
    'unpaid', NULL, 'pending',
    35875.00, 4305.00, 40180.00, 717.50,
    39462.50, 0.00, 39462.50
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1756', '2026-09-14'::date,
    '2026-09-14'::date, '2026-09-14'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHMGDS, PHCADS, PHMGDS|JPA-W2W-GA-SEP-001|CODE: SCM-MT-01', 'N/A', 'N/A', 40180.00
  );

  -- Invoice 1794 · CA LOGISTICS CORPORATION
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('CA LOGISTICS CORPORATION')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'CA LOGISTICS CORPORATION';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1794', v_client_id, '2026-10-09',
    '2026-10-09'::date, '2026-10-09'::date,
    '2026-10-19'::date, '2026-11-18'::date,
    'unpaid', NULL, 'pending',
    189955.36, 22794.64, 212750.00, 3799.11,
    208950.89, 0.00, 208950.89
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1794', '2026-10-19'::date,
    '2026-10-19'::date, '2026-10-19'::date,
    '[seed: ar unpaid] HAULING SERVICES', 'N/A', 'N/A', 212750.00
  );

  -- Invoice 1795 · CA LOGISTICS CORPORATION
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('CA LOGISTICS CORPORATION')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'CA LOGISTICS CORPORATION';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1795', v_client_id, 'OCTOBER 03-07, 2026',
    NULL, NULL,
    '2026-10-16'::date, '2026-11-15'::date,
    'unpaid', NULL, 'pending',
    379910.71, 45589.29, 425500.00, 7598.21,
    417901.79, 0.00, 417901.79
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1795', '2026-10-16'::date,
    '2026-10-16'::date, '2026-10-16'::date,
    '[seed: ar unpaid] HAULING SERVICES', 'N/A', 'N/A', 425500.00
  );

  -- Invoice 1796 · DECOARTS MARKETING, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('DECOARTS MARKETING, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'DECOARTS MARKETING, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1796', v_client_id, 'OCTOBER 13-21, 2026',
    NULL, NULL,
    '2026-10-21'::date, '2026-11-16'::date,
    'unpaid', NULL, 'pending',
    6443017.86, 773162.14, 7216180.00, 128860.36,
    7087319.64, 0.00, 7087319.64
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1796', '2026-10-21'::date,
    '2026-10-21'::date, '2026-10-26'::date,
    '[seed: ar unpaid] HAULING SERVICES|ORIGIN: CARMEN/SASA DISTRIBUTION', 'N/A', 'N/A', 7216180.00
  );

  -- Invoice 1798 · CA LOGISTICS CORPORATION
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('CA LOGISTICS CORPORATION')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'CA LOGISTICS CORPORATION';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1798', v_client_id, 'OCTOBER 10-15, 2026',
    NULL, NULL,
    '2026-10-26'::date, '2026-11-25'::date,
    'unpaid', NULL, 'pending',
    564732.14, 67767.86, 632500.00, 11294.64,
    621205.36, 0.00, 621205.36
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1798', '2026-10-26'::date,
    '2026-10-26'::date, '2026-10-26'::date,
    '[seed: ar unpaid] HAULING SERVICES', 'N/A', 'N/A', 632500.00
  );

  -- Invoice 1807 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1807', v_client_id, 'SEPTEMBER 01-15, 2026',
    NULL, NULL,
    '2026-10-09'::date, '2026-11-08'::date,
    'unpaid', NULL, 'pending',
    17098.00, 2051.76, 19149.76, 341.96,
    18807.80, 0.00, 18807.80
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1807', '2026-10-09'::date,
    '2026-10-09'::date, '2026-10-09'::date,
    '[seed: ar unpaid] HAULING SERVICES|MM 6W WETLEASE|TOLL REIMBURSEMENT CTRL#3004', 'N/A', 'N/A', 19149.76
  );

  -- Invoice 1808 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1808', v_client_id, 'SEPTEMBER 01-15, 2026',
    NULL, NULL,
    '2026-10-09'::date, '2026-11-08'::date,
    'unpaid', NULL, 'pending',
    300.00, 36.00, 336.00, 6.00,
    330.00, 0.00, 330.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1808', '2026-10-09'::date,
    '2026-10-09'::date, '2026-10-09'::date,
    '[seed: ar unpaid] HAULING SERVICES|MM 6W WETLEASE|PASSWAY REIMBURSEMENT CTRL#3005', 'N/A', 'N/A', 336.00
  );

  -- Invoice 1809 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1809', v_client_id, 'SEPTEMBER 01-15, 2026',
    NULL, NULL,
    '2026-10-09'::date, '2026-11-08'::date,
    'unpaid', NULL, 'pending',
    52018.10, 6242.17, 58260.27, 1040.36,
    57219.91, 0.00, 57219.91
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1809', '2026-10-09'::date,
    '2026-10-09'::date, '2026-10-09'::date,
    '[seed: ar unpaid] HAULING SERVICES|MM 6W WETLEASE|FUEL REIMBURSEMENT CTRL#3006', 'N/A', 'N/A', 58260.27
  );

  -- Invoice 1810 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1810', v_client_id, 'SEPTEMBER 16-30, 2026',
    NULL, NULL,
    '2026-10-10'::date, '2026-11-09'::date,
    'unpaid', NULL, 'pending',
    30476785.71, 3657214.29, 34134000.00, 609535.71,
    33524464.29, 0.00, 33524464.29
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1810', '2026-10-10'::date,
    '2026-10-10'::date, '2026-10-10'::date,
    '[seed: ar unpaid] HAULING SERVICES|MSPX201202610-120949|MM IIS 10W ON CALL', 'N/A', 'N/A', 34134000.00
  );

  -- Invoice 1812 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1812', v_client_id, 'SEPTEMBER 01-15, 2026',
    NULL, NULL,
    '2026-10-13'::date, '2026-11-12'::date,
    'unpaid', NULL, 'pending',
    5370535.71, 644464.29, 6015000.00, 107410.71,
    5907589.29, 0.00, 5907589.29
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1812', '2026-10-13'::date,
    '2026-10-13'::date, '2026-10-13'::date,
    '[seed: ar unpaid] HAULING SERVICES|MDSPX201202610-121133|MM IIS 10W ON CALL|DISPUTE', 'N/A', 'N/A', 6015000.00
  );

  -- Invoice 1823 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1823', v_client_id, 'SEPTEMBER 01-15, 2026',
    NULL, NULL,
    '2026-10-26'::date, '2026-11-25'::date,
    'unpaid', NULL, 'pending',
    1022.00, 122.64, 1144.64, 20.44,
    1124.20, 0.00, 1124.20
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1823', '2026-10-26'::date,
    '2026-10-26'::date, '2026-10-26'::date,
    '[seed: ar unpaid] HAULING SERVICES|MM INTRA-LUZON|FORWARD HAUL/BACKHAUL|6W WETLEASE|TOLL FEE REIMBURSEMENT  CTRL#3004-2', 'N/A', 'N/A', 1144.64
  );

  -- Invoice 1824 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1824', v_client_id, 'OCTOBER 01-15, 2026',
    NULL, NULL,
    '2026-10-26'::date, '2026-11-25'::date,
    'unpaid', NULL, 'pending',
    26434375.00, 3172125.00, 29606500.00, 528687.50,
    29077812.50, 0.00, 29077812.50
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1824', '2026-10-26'::date,
    '2026-10-26'::date, '2026-10-26'::date,
    '[seed: ar unpaid] HAULING SERVICES|MSPX201202610-124765|MM INTER-ISLAND|FORWARD HAUL/BACK HAUL|10W ON CALL', 'N/A', 'N/A', 29606500.00
  );

  -- Invoice 1825 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1825', v_client_id, 'OCTOBER 01-15, 2026',
    NULL, NULL,
    '2026-10-27'::date, '2026-11-26'::date,
    'unpaid', NULL, 'pending',
    75156.25, 9018.75, 84175.00, 1503.13,
    82671.87, 0.00, 82671.87
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1825', '2026-10-27'::date,
    '2026-10-27'::date, '2026-10-27'::date,
    '[seed: ar unpaid] HAULING SERVICES|MSPX201202610-124784|MM INTRA-LUZON|FORWARD HAUL|6W WETLEASE', 'N/A', 'N/A', 84175.00
  );

  -- Invoice 1826 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1826', v_client_id, 'OCTOBER 01-15, 2026',
    NULL, NULL,
    '2026-10-29'::date, '2026-11-28'::date,
    'unpaid', NULL, 'pending',
    69642.86, 8357.14, 78000.00, 1392.86,
    76607.14, 0.00, 76607.14
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1826', '2026-10-29'::date,
    '2026-10-29'::date, '2026-10-29'::date,
    '[seed: ar unpaid] HAULING SERVICES|MISPX201202610-125452|MM IIS FORWARD HAUL|10W ON CALL|10.10 INCENTIVES', 'N/A', 'N/A', 78000.00
  );

  -- Invoice 1827 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1827', v_client_id, 'OCTOBER 01-15, 2026',
    NULL, NULL,
    '2026-10-29'::date, '2026-11-28'::date,
    'unpaid', NULL, 'pending',
    2707142.86, 324857.14, 3032000.00, 54142.86,
    2977857.14, 0.00, 2977857.14
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1827', '2026-10-29'::date,
    '2026-10-29'::date, '2026-10-29'::date,
    '[seed: ar unpaid] HAULING SERVICES|MISPX201202610-125517|MM IIS FORWARD HAUL/BACK HAUL|10W ON CALL|FLASH INCENTIVES', 'N/A', 'N/A', 3032000.00
  );

  -- Invoice 1828 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1828', v_client_id, 'OCTOBER 01-15, 2026',
    NULL, NULL,
    '2026-11-04'::date, '2026-12-04'::date,
    'unpaid', NULL, 'pending',
    22321.43, 2678.57, 25000.00, 446.43,
    24553.57, 0.00, 24553.57
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1828', '2026-11-04'::date,
    '2026-11-04'::date, '2026-11-04'::date,
    '[seed: ar unpaid] HAULING SERVICES|MDSPX201202611-126445|MM INTER-ISLAND|FORWARD HAUL/BACK HAUL|10W ON CALL|TRIP/SPEED INCENTIVE DISPUTE', 'N/A', 'N/A', 25000.00
  );

  -- Invoice 1829 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1829', v_client_id, 'SEPTEMBER 16-30, 2026',
    NULL, NULL,
    '2026-11-05'::date, '2026-12-05'::date,
    'unpaid', NULL, 'pending',
    274.00, 32.88, 306.88, 5.48,
    301.40, 0.00, 301.40
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1829', '2026-11-05'::date,
    '2026-11-05'::date, '2026-11-05'::date,
    '[seed: ar unpaid] HAULING SERVICES|MM INTRA-LUZON|FORWARD HAUL|6W WETLEASE|TOLL FEE REIMBURSEMENT CTRL#3007-2', 'N/A', 'N/A', 306.88
  );

  -- Invoice 1830 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1830', v_client_id, 'OCTOBER 01-15, 2026',
    NULL, NULL,
    '2026-11-05'::date, '2026-12-05'::date,
    'unpaid', NULL, 'pending',
    5966.00, 715.92, 6681.92, 119.32,
    6562.60, 0.00, 6562.60
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1830', '2026-11-05'::date,
    '2026-11-05'::date, '2026-11-05'::date,
    '[seed: ar unpaid] HAULING SERVICES|MM INTRA-LUZON|FORWARD HAUL/BACK HAUL|6W WETLEASE|TOLL FEE REIMBURSEMENT CTRL#3011', 'N/A', 'N/A', 6681.92
  );

  -- Invoice 1831 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1831', v_client_id, 'OCTOBER 01-15, 2026',
    NULL, NULL,
    '2026-11-11'::date, '2026-12-11'::date,
    'unpaid', NULL, 'pending',
    30660.24, 3679.23, 34339.47, 613.20,
    33726.27, 0.00, 33726.27
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1831', '2026-11-11'::date,
    '2026-11-11'::date, '2026-11-11'::date,
    '[seed: ar unpaid] HAULING SERVICES|MM INTRA-LUZON|FORWARD HAUL/BACK HAUL|6W WETLEASE|FUEL REIMBURSEMENT CTRL#3010', 'N/A', 'N/A', 34339.47
  );

  -- Invoice 1832 · WALL STREET COURIER SERVICES INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('WALL STREET COURIER SERVICES INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'WALL STREET COURIER SERVICES INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1832', v_client_id, 'NOVEMBER 01-18, 2026',
    NULL, NULL,
    '2026-11-11'::date, '2026-12-11'::date,
    'unpaid', NULL, 'pending',
    190000.00, 22800.00, 212800.00, 3800.00,
    209000.00, 0.00, 209000.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1832', '2026-11-11'::date,
    '2026-11-11'::date, '2026-11-11'::date,
    '[seed: ar unpaid] HAULING SERVICES|MM IIS FORWARD HAUL|10W ON CALL', 'N/A', 'N/A', 212800.00
  );

  -- Invoice 1834 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1834', v_client_id, 'OCTOBER 16-31, 2026',
    NULL, NULL,
    '2026-11-13'::date, '2026-12-13'::date,
    'unpaid', NULL, 'pending',
    664732.14, 79767.86, 744500.00, 13294.64,
    731205.36, 0.00, 731205.36
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1834', '2026-11-13'::date,
    '2026-11-13'::date, '2026-11-13'::date,
    '[seed: ar unpaid] HAULING SERVICES|MSPX201202611-129461|SCM IIS FORWARD HAUL|10W ON CALL', 'N/A', 'N/A', 744500.00
  );

  -- Invoice 1835 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1835', v_client_id, 'OCTOBER 16-31, 2026',
    NULL, NULL,
    '2026-11-12'::date, '2026-12-12'::date,
    'unpaid', NULL, 'pending',
    103531.25, 12423.75, 115955.00, 2070.63,
    113884.37, 0.00, 113884.37
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1835', '2026-11-12'::date,
    '2026-11-12'::date, '2026-11-12'::date,
    '[seed: ar unpaid] HAULING SERVICES|MSPX201202611-129600|MM INTRA-LUZON|FORWARD HAUL|6W WETLEASE', 'N/A', 'N/A', 115955.00
  );

  -- Invoice 1836 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1836', v_client_id, 'OCTOBER 16-31, 2026',
    NULL, NULL,
    '2026-11-12'::date, '2026-12-12'::date,
    'unpaid', NULL, 'pending',
    27725446.43, 3327053.57, 31052500.00, 554508.93,
    30497991.07, 0.00, 30497991.07
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1836', '2026-11-12'::date,
    '2026-11-12'::date, '2026-11-12'::date,
    '[seed: ar unpaid] HAULING SERVICES|MSPX201202611-129280|MM INTER-ISLAND|FORWARD HAUL BACKHAUL|10W ON CALL', 'N/A', 'N/A', 31052500.00
  );

  -- Invoice 1837 · SPX PHILIPPINES, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SPX PHILIPPINES, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SPX PHILIPPINES, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1837', v_client_id, 'OCTOBER 16-31, 2026',
    NULL, NULL,
    '2026-11-14'::date, '2026-12-14'::date,
    'unpaid', NULL, 'pending',
    2665892.86, 319907.14, 2985800.00, 53317.86,
    2932482.14, 0.00, 2932482.14
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1837', '2026-11-14'::date,
    '2026-11-14'::date, '2026-11-14'::date,
    '[seed: ar unpaid] HAULING SERVICES|MISPX201202611-130337|MM INTER-ISLAND|FORWARD HAUL BACKHAUL|10W ON CALL|FLASH INCENTIVES', 'N/A', 'N/A', 2985800.00
  );

  -- Invoice 1860 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1860', v_client_id, '2026-10-03',
    '2026-10-03'::date, '2026-10-03'::date,
    '2026-10-12'::date, '2026-11-11'::date,
    'unpaid', NULL, 'pending',
    18255.73, 2190.69, 20446.42, 365.11,
    20081.31, 0.00, 20081.31
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1860', '2026-10-12'::date,
    '2026-10-12'::date, '2026-10-12'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHM9DS, PHCADS|JPA-W2W-GA-OCT-002|CODE: SCM-MT-01', 'N/A', 'N/A', 20446.42
  );

  -- Invoice 1868 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1868', v_client_id, 'OCTOBER 5-7, 2026',
    NULL, NULL,
    '2026-10-22'::date, '2026-11-21'::date,
    'unpaid', NULL, 'pending',
    454000.00, 54480.00, 508480.00, 9080.00,
    499400.00, 0.00, 499400.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1868', '2026-10-22'::date,
    '2026-10-22'::date, '2026-10-22'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHK|JPA-W2W-GC-OCT-004-R2|CODE: SCM-MT-01', 'N/A', 'N/A', 508480.00
  );

  -- Invoice 1869 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1869', v_client_id, 'SEPTEMBER 27-OCTOBER 8, 2026',
    NULL, NULL,
    '2026-10-22'::date, '2026-11-21'::date,
    'unpaid', NULL, 'pending',
    342721.43, 41126.57, 383848.00, 6854.43,
    376993.57, 0.00, 376993.57
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1869', '2026-10-22'::date,
    '2026-10-22'::date, '2026-10-22'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHM, PHP|JPA-W2W-GB-OCT-002-R2|CODE: SCM-MT-01', 'N/A', 'N/A', 383848.00
  );

  -- Invoice 1870 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1870', v_client_id, 'SEPTEMBER 2-8, 2026',
    NULL, NULL,
    '2026-10-23'::date, '2026-11-22'::date,
    'unpaid', NULL, 'pending',
    912927.28, 109551.27, 1022478.55, 18258.55,
    1004220.00, 0.00, 1004220.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1870', '2026-10-23'::date,
    '2026-10-23'::date, '2026-10-23'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHCEB1, PHT|JPA-W2W-GC-SEP-005-R3|CODE: SCM-MT-01', 'N/A', 'N/A', 1022478.55
  );

  -- Invoice 1871 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1871', v_client_id, 'SEPTEMBER 24-27, 2026',
    NULL, NULL,
    '2026-10-23'::date, '2026-11-22'::date,
    'unpaid', NULL, 'pending',
    319942.86, 38393.14, 358336.00, 6398.86,
    351937.14, 0.00, 351937.14
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1871', '2026-10-23'::date,
    '2026-10-23'::date, '2026-10-23'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHP|JPA-W2W-GB-OCT-001-R2|CODE: SCM-MT-01', 'N/A', 'N/A', 358336.00
  );

  -- Invoice 1872 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1872', v_client_id, 'SEPTEMBER 13-21, 2026',
    NULL, NULL,
    '2026-10-23'::date, '2026-11-22'::date,
    'unpaid', NULL, 'pending',
    531800.00, 63816.00, 595616.00, 10636.00,
    584980.00, 0.00, 584980.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1872', '2026-10-23'::date,
    '2026-10-23'::date, '2026-10-23'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHCEB1, PHK|JPA-W2W-GC-OCT-001-R2|CODE: SCM-MT-01', 'N/A', 'N/A', 595616.00
  );

  -- Invoice 1873 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1873', v_client_id, '2026-09-23',
    '2026-09-23'::date, '2026-09-23'::date,
    '2026-10-23'::date, '2026-11-22'::date,
    'unpaid', NULL, 'pending',
    211700.00, 25404.00, 237104.00, 4234.00,
    232870.00, 0.00, 232870.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1873', '2026-10-23'::date,
    '2026-10-23'::date, '2026-10-23'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHK|JPA-W2W-GC-OCT-002-R3|CODE: SCM-MT-01', 'N/A', 'N/A', 237104.00
  );

  -- Invoice 1874 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1874', v_client_id, '2026-09-25',
    '2026-09-25'::date, '2026-09-25'::date,
    '2026-10-23'::date, '2026-11-22'::date,
    'unpaid', NULL, 'pending',
    146545.00, 17585.40, 164130.40, 2930.90,
    161199.50, 0.00, 161199.50
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1874', '2026-10-23'::date,
    '2026-10-23'::date, '2026-10-23'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHCEB1|JPA-W2W-GC-OCT-002-R4|CODE: SCM-MT-01', 'N/A', 'N/A', 164130.40
  );

  -- Invoice 1875 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1875', v_client_id, 'OCTOBER 6-10, 2026',
    NULL, NULL,
    '2026-10-23'::date, '2026-11-22'::date,
    'unpaid', NULL, 'pending',
    856942.86, 102833.14, 959776.00, 17138.86,
    942637.14, 0.00, 942637.14
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1875', '2026-10-23'::date,
    '2026-10-23'::date, '2026-10-23'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHT, PHDVO1|JPA-W2W-GC-OCT-006-R1|CODE: SCM-MT-01', 'N/A', 'N/A', 959776.00
  );

  -- Invoice 1876 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1876', v_client_id, 'SEPTEMBER 26-OCTOBER 23, 2026',
    NULL, NULL,
    '2026-10-27'::date, '2026-11-26'::date,
    'unpaid', NULL, 'pending',
    50005.73, 6000.69, 56006.42, 1000.11,
    55006.31, 0.00, 55006.31
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1876', '2026-10-27'::date,
    '2026-10-27'::date, '2026-10-27'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GA-OCT-004|DARKSTORE, FORWARD HAUL, 6W, ON-CALL', 'N/A', 'N/A', 56006.42
  );

  -- Invoice 1877 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1877', v_client_id, '2026-08-30',
    '2026-08-30'::date, '2026-08-30'::date,
    '2026-10-28'::date, '2026-11-27'::date,
    'unpaid', NULL, 'pending',
    17500.00, 2100.00, 19600.00, 350.00,
    19250.00, 0.00, 19250.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1877', '2026-10-28'::date,
    '2026-10-28'::date, '2026-10-28'::date,
    '[seed: ar unpaid] HAULING SERVICES|WAREHOUSE: PHM8DS, PHM9DS|DARKSTORE, FORWARD HAUL, 6W, ON-CALL', 'N/A', 'N/A', 19600.00
  );

  -- Invoice 1878 · DECOARTS MARKETING, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('DECOARTS MARKETING, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'DECOARTS MARKETING, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1878', v_client_id, 'OCTOBER 20-28, 2026',
    NULL, NULL,
    '2026-10-28'::date, '2026-11-18'::date,
    'unpaid', NULL, 'pending',
    5018928.57, 602271.43, 5621200.00, 100378.57,
    5520821.43, 0.00, 5520821.43
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1878', '2026-10-28'::date,
    '2026-10-28'::date, '2026-10-28'::date,
    '[seed: ar unpaid] HAULING SERVICES|ORIGIN: CARMEN/SASA DISTRIBUTION|BACKLOAD TRIP', 'N/A', 'N/A', 5621200.00
  );

  -- Invoice 1879 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1879', v_client_id, 'OCTOBER 17-21, 2026',
    NULL, NULL,
    '2026-10-29'::date, '2026-11-28'::date,
    'unpaid', NULL, 'pending',
    493221.43, 59186.57, 552408.00, 9864.43,
    542543.57, 0.00, 542543.57
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1879', '2026-10-29'::date,
    '2026-10-29'::date, '2026-10-29'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GB-OCT-004-R1|SCOMMERCE IIS, FORWARD HAUL, 10W, ON-CALL', 'N/A', 'N/A', 552408.00
  );

  -- Invoice 1880 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1880', v_client_id, '2026-09-25',
    '2026-09-25'::date, '2026-09-25'::date,
    '2026-11-03'::date, '2026-12-03'::date,
    'unpaid', NULL, 'pending',
    214900.00, 25788.00, 240688.00, 4298.00,
    236390.00, 0.00, 236390.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1880', '2026-11-03'::date,
    '2026-11-03'::date, '2026-11-03'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GC-OCT-002-R6|CROSSDOCK, FORWARD HAUL, 10W, ON-CALL', 'N/A', 'N/A', 240688.00
  );

  -- Invoice 1881 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1881', v_client_id, 'OCTOBER 30-31, 2026',
    NULL, NULL,
    '2026-11-03'::date, '2026-12-03'::date,
    'unpaid', NULL, 'pending',
    40205.73, 4824.69, 45030.42, 804.11,
    44226.31, 0.00, 44226.31
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1881', '2026-11-03'::date,
    '2026-11-03'::date, '2026-11-03'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GA-NOV-002|DARKSTORE, FORWARD HAUL, 6W, ON-CALL', 'N/A', 'N/A', 45030.42
  );

  -- Invoice 1883 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1883', v_client_id, 'OCTOBER 27-29, 2026',
    NULL, NULL,
    '2026-11-05'::date, '2026-12-05'::date,
    'unpaid', NULL, 'pending',
    1048342.86, 125801.14, 1174144.00, 20966.86,
    1153177.14, 0.00, 1153177.14
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1883', '2026-11-05'::date,
    '2026-11-05'::date, '2026-11-05'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GC-NOV-005-R1|SCOMMERCE IIS / CROSSDOCK , FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 1174144.00
  );

  -- Invoice 1884 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1884', v_client_id, 'OCTOBER 23-27, 2026',
    NULL, NULL,
    '2026-11-05'::date, '2026-12-05'::date,
    'unpaid', NULL, 'pending',
    1695928.57, 203511.43, 1899440.00, 33918.57,
    1865521.43, 0.00, 1865521.43
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1884', '2026-11-05'::date,
    '2026-11-05'::date, '2026-11-05'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GC-NOV-004-R1|SCOMMERCE IIS / CROSSDOCK , FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 1899440.00
  );

  -- Invoice 1885 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1885', v_client_id, 'OCTOBER 1-6, 2026',
    NULL, NULL,
    '2026-11-05'::date, '2026-12-05'::date,
    'unpaid', NULL, 'pending',
    1482905.16, 177948.62, 1660853.78, 29658.10,
    1631195.68, 0.00, 1631195.68
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1885', '2026-11-05'::date,
    '2026-11-05'::date, '2026-11-05'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GC-NOV-001-R1|SCOMMERCE IIS / CROSSDOCK , FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 1660853.78
  );

  -- Invoice 1886 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1886', v_client_id, 'OCTOBER 18-28, 2026',
    NULL, NULL,
    '2026-11-05'::date, '2026-12-05'::date,
    'unpaid', NULL, 'pending',
    1252142.86, 150257.14, 1402400.00, 25042.86,
    1377357.14, 0.00, 1377357.14
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1886', '2026-11-05'::date,
    '2026-11-05'::date, '2026-11-05'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GB-NOV-003-R1|SCOMMERCE IIS / CROSSDOCK , FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 1402400.00
  );

  -- Invoice 1887 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1887', v_client_id, 'OCTOBER 7-14, 2026',
    NULL, NULL,
    '2026-11-05'::date, '2026-12-05'::date,
    'unpaid', NULL, 'pending',
    1783303.26, 213996.39, 1997299.65, 35666.07,
    1961633.58, 0.00, 1961633.58
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1887', '2026-11-05'::date,
    '2026-11-05'::date, '2026-11-05'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GC-NOV-002-R1|SCOMMERCE IIS / CROSSDOCK , FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 1997299.65
  );

  -- Invoice 1888 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1888', v_client_id, 'OCTOBER 13-17, 2026',
    NULL, NULL,
    '2026-11-06'::date, '2026-12-06'::date,
    'unpaid', NULL, 'pending',
    1489608.14, 178752.98, 1668361.12, 29792.16,
    1638568.96, 0.00, 1638568.96
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1888', '2026-11-06'::date,
    '2026-11-06'::date, '2026-11-06'::date,
    '[seed: ar unpaid] HAULING SERVICES| JPA-W2W-GB-NOV-002-R1|SCOMMERCE IIS / CROSSDOCK , FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 1668361.12
  );

  -- Invoice 1889 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1889', v_client_id, 'OCTOBER 8-30, 2026',
    NULL, NULL,
    '2026-11-06'::date, '2026-12-06'::date,
    'unpaid', NULL, 'pending',
    650961.46, 78115.38, 729076.84, 13019.23,
    716057.61, 0.00, 716057.61
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1889', '2026-11-06'::date,
    '2026-11-06'::date, '2026-11-06'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GA-NOV-001-R1|SCOMMERCE IIS / DARKSTORE / CROSSDOCK|FORWARD HAUL, 6W / 10W, ON-CALL TRIP', 'N/A', 'N/A', 729076.84
  );

  -- Invoice 1890 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1890', v_client_id, 'OCTOBER 21-22, 2026',
    NULL, NULL,
    '2026-11-06'::date, '2026-12-06'::date,
    'unpaid', NULL, 'pending',
    442392.86, 53087.14, 495480.00, 8847.86,
    486632.14, 0.00, 486632.14
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1890', '2026-11-06'::date,
    '2026-11-06'::date, '2026-11-06'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GC-OCT-009-R1|SCOMMERCE IIS, FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 495480.00
  );

  -- Invoice 1891 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1891', v_client_id, 'OCTOBER 13-20, 2026',
    NULL, NULL,
    '2026-11-06'::date, '2026-12-06'::date,
    'unpaid', NULL, 'pending',
    1608185.71, 192982.29, 1801168.00, 32163.71,
    1769004.29, 0.00, 1769004.29
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1891', '2026-11-06'::date,
    '2026-11-06'::date, '2026-11-06'::date,
    '[seed: ar unpaid] HAULING SERVICES| JPA-W2W-GC-OCT-008-R1|SCOMMERCE IIS, FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 1801168.00
  );

  -- Invoice 1892 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1892', v_client_id, 'OCTOBER 2-13, 2026',
    NULL, NULL,
    '2026-11-06'::date, '2026-12-06'::date,
    'unpaid', NULL, 'pending',
    1423271.43, 170792.57, 1594064.00, 28465.43,
    1565598.57, 0.00, 1565598.57
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1892', '2026-11-06'::date,
    '2026-11-06'::date, '2026-11-06'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GB-NOV-001-R2|SCOMMERCE IIS / CROSSDOCK , FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 1594064.00
  );

  -- Invoice 1893 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1893', v_client_id, 'OCTOBER 14-23, 2026',
    NULL, NULL,
    '2026-11-06'::date, '2026-12-06'::date,
    'unpaid', NULL, 'pending',
    1368721.43, 164246.57, 1532968.00, 27374.43,
    1505593.57, 0.00, 1505593.57
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1893', '2026-11-06'::date,
    '2026-11-06'::date, '2026-11-06'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GC-NOV-003-R2|SCOMMERCE IIS / CROSSDOCK , FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 1532968.00
  );

  -- Invoice 1894 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1894', v_client_id, '2026-09-29',
    '2026-09-29'::date, '2026-09-29'::date,
    '2026-11-06'::date, '2026-12-06'::date,
    'unpaid', NULL, 'pending',
    126742.86, 15209.14, 141952.00, 2534.86,
    139417.14, 0.00, 139417.14
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1894', '2026-11-06'::date,
    '2026-11-06'::date, '2026-11-06'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GB-OCT-003-R1|SCOMMERCE IIS, BACKHAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 141952.00
  );

  -- Invoice 1895 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1895', v_client_id, '2026-09-29',
    '2026-09-29'::date, '2026-09-29'::date,
    '2026-11-06'::date, '2026-12-06'::date,
    'unpaid', NULL, 'pending',
    215800.00, 25896.00, 241696.00, 4316.00,
    237380.00, 0.00, 237380.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1895', '2026-11-06'::date,
    '2026-11-06'::date, '2026-11-06'::date,
    '[seed: ar unpaid] HAULING SERVICES| JPA-W2W-GB-OCT-002-R3|CROSSDOCK, FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 241696.00
  );

  -- Invoice 1896 · SCOMMERCE PHILIPPINES,INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SCOMMERCE PHILIPPINES,INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SCOMMERCE PHILIPPINES,INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1896', v_client_id, '2026-10-19',
    '2026-10-19'::date, '2026-10-19'::date,
    '2026-11-09'::date, '2026-12-09'::date,
    'unpaid', NULL, 'pending',
    170321.43, 20438.57, 190760.00, 3406.43,
    187353.57, 0.00, 187353.57
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1896', '2026-11-09'::date,
    '2026-11-09'::date, '2026-11-09'::date,
    '[seed: ar unpaid] HAULING SERVICES|JPA-W2W-GC-NOV-003-R3|SCOMMERCE IIS, FORWARD HAUL, 10W, ON-CALL TRIP', 'N/A', 'N/A', 190760.00
  );

  -- Invoice 1901 · CA LOGISTICS CORPORATION
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('CA LOGISTICS CORPORATION')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'CA LOGISTICS CORPORATION';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1901', v_client_id, 'OCTOBER 17-19, 2026',
    NULL, NULL,
    '2026-10-29'::date, '2026-11-28'::date,
    'unpaid', NULL, 'pending',
    569866.07, 68383.93, 638250.00, 11397.32,
    626852.68, 0.00, 626852.68
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1901', '2026-10-29'::date,
    '2026-10-29'::date, '2026-10-29'::date,
    '[seed: ar unpaid] HAULING SERVICES', 'N/A', 'N/A', 638250.00
  );

  -- Invoice 1904 · CA LOGISTICS CORPORATION
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('CA LOGISTICS CORPORATION')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'CA LOGISTICS CORPORATION';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1904', v_client_id, 'OCTOBER 21-23, 2026',
    NULL, NULL,
    '2026-11-03'::date, '2026-12-03'::date,
    'unpaid', NULL, 'pending',
    554464.29, 66535.71, 621000.00, 11089.29,
    609910.71, 0.00, 609910.71
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1904', '2026-11-03'::date,
    '2026-11-03'::date, '2026-11-03'::date,
    '[seed: ar unpaid] HAULING SERVICES', 'N/A', 'N/A', 621000.00
  );

  -- Invoice 1905 · DECOARTS MARKETING, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('DECOARTS MARKETING, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'DECOARTS MARKETING, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1905', v_client_id, 'OCTOBER 23-NOVEMBER 03, 2026',
    NULL, NULL,
    '2026-11-04'::date, '2026-11-25'::date,
    'unpaid', NULL, 'pending',
    3909991.07, 469198.93, 4379190.00, 78199.82,
    4300990.18, 0.00, 4300990.18
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1905', '2026-11-04'::date,
    '2026-11-04'::date, '2026-11-04'::date,
    '[seed: ar unpaid] HAULING SERVICES|ORIGIN: CARMEN/SASA DISTRIBUTION|BACKLOAD TRIP', 'N/A', 'N/A', 4379190.00
  );

  -- Invoice 1906 · DIZON FARMS PRODUCE INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('DIZON FARMS PRODUCE INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'DIZON FARMS PRODUCE INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1906', v_client_id, 'NOVEMBER 03-06, 2026',
    NULL, NULL,
    '2026-11-09'::date, '2026-11-19'::date,
    'unpaid', NULL, 'pending',
    83930.00, 10071.60, 94001.60, 1678.60,
    92323.00, 0.00, 92323.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1906', '2026-11-09'::date,
    '2026-11-09'::date, '2026-11-09'::date,
    '[seed: ar unpaid] HAULING SERVICES|10W - BACKLOAD, ON CALL TRIP', 'N/A', 'N/A', 94001.60
  );

  -- Invoice 1907 · SUNNYPHIL INCORPORATED
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('SUNNYPHIL INCORPORATED')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'SUNNYPHIL INCORPORATED';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1907', v_client_id, 'NOVEMBER 03-06, 2026',
    NULL, NULL,
    '2026-11-09'::date, '2026-11-19'::date,
    'unpaid', NULL, 'pending',
    113930.00, 13671.60, 127601.60, 2278.60,
    125323.00, 0.00, 125323.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1907', '2026-11-09'::date,
    '2026-11-09'::date, '2026-11-09'::date,
    '[seed: ar unpaid] HAULING SERVICES|10W - BACKLOAD, ON CALL TRIP', 'N/A', 'N/A', 127601.60
  );

  -- Invoice 1908 · CA LOGISTICS CORPORATION
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('CA LOGISTICS CORPORATION')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'CA LOGISTICS CORPORATION';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1908', v_client_id, 'OCTOBER 22-26, 2026',
    NULL, NULL,
    '2026-11-06'::date, '2026-12-06'::date,
    'unpaid', NULL, 'pending',
    379910.71, 45589.29, 425500.00, 7598.21,
    417901.79, 0.00, 417901.79
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1908', '2026-11-06'::date,
    '2026-11-06'::date, '2026-11-06'::date,
    '[seed: ar unpaid] HAULING SERVICES|FORWARD TRIP', 'N/A', 'N/A', 425500.00
  );

  -- Invoice 1909 · DECOARTS MARKETING, INC.
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('DECOARTS MARKETING, INC.')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'DECOARTS MARKETING, INC.';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1909', v_client_id, 'NOVEMBER 02-10, 2026',
    NULL, NULL,
    '2026-11-11'::date, '2026-12-11'::date,
    'unpaid', NULL, 'pending',
    3688750.00, 442650.00, 4131400.00, 73775.00,
    4057625.00, 0.00, 4057625.00
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1909', '2026-11-11'::date,
    '2026-11-11'::date, '2026-11-11'::date,
    '[seed: ar unpaid] HAULING SERVICES|ORIGIN: CARMEN/SASA DISTRIBUTION|10W, ONCALL - BACKLOAD TRIP', 'N/A', 'N/A', 4131400.00
  );

  -- Invoice 1910 · CA LOGISTICS CORPORATION
  SELECT id INTO v_client_id FROM ar_clients
   WHERE lower(trim(name)) = lower(trim('CA LOGISTICS CORPORATION')) LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Missing AR client %', 'CA LOGISTICS CORPORATION';
  END IF;

  INSERT INTO ar_summaries
    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,
     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,
     total_after_ewt, deductions_total, grand_total)
  VALUES (
    '1910', v_client_id, 'OCTOBER 28-NOVEMBER 03, 2026',
    NULL, NULL,
    '2026-11-13'::date, '2026-12-13'::date,
    'unpaid', NULL, 'pending',
    2243526.79, 269223.21, 2512750.00, 44870.54,
    2467879.46, 0.00, 2467879.46
  ) RETURNING id INTO v_summary_id;

  INSERT INTO ar_detail_entries
    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
  VALUES (
    v_summary_id, '1910', '2026-11-13'::date,
    '2026-11-13'::date, '2026-11-13'::date,
    '[seed: ar unpaid] HAULING SERVICES|IIS, FORWARD HAUL, 10WH, ONCALL', 'N/A', 'N/A', 2512750.00
  );

END $$;
