#!/usr/bin/env node
/**
 * Seed AR summaries + detail lines from an "Accounts Receivable - Unpaid Invoices" workbook.
 *
 * Prefer the SQL migration for app recreate (runs on boot via migrate()):
 *   seeds/ar-unpaid-invoices.xlsx  →  migrations/034_seed_ar_unpaid_invoices.sql
 * Regenerate SQL after replacing the xlsx:
 *   node scripts/generate-ar-unpaid-seed-sql.mjs
 *
 * Direct DB seed (optional):
 *   DATABASE_URL=postgres://ap:…@host:5432/aptracker \
 *     node scripts/seed-ar-unpaid-xlsx.mjs [xlsx-path]
 *
 * Default xlsx path: seeds/ar-unpaid-invoices.xlsx
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const filePath =
  process.argv[2] ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../seeds/ar-unpaid-invoices.xlsx');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    'Usage: DATABASE_URL=postgres://… node scripts/seed-ar-unpaid-xlsx.mjs [xlsx-path]',
  );
  process.exit(1);
}
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

function excelDateToIso(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const t = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    const n = Number(t);
    if (Number.isFinite(n) && n > 20000) value = n;
    else return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function roundMoney(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function moneyString(n) {
  return roundMoney(n).toFixed(2);
}

function computeArTotals(vatInc, deductionsTotal = 0) {
  const totalSalesVatinc = roundMoney(vatInc);
  const totalSalesVatex = roundMoney(totalSalesVatinc / 1.12);
  const vatAmount = roundMoney(totalSalesVatinc - totalSalesVatex);
  const ewtAmount = roundMoney(totalSalesVatex * 0.02);
  const totalAfterEwt = roundMoney(totalSalesVatinc - ewtAmount);
  const deductions = roundMoney(deductionsTotal);
  const grandTotal = roundMoney(totalAfterEwt - deductions);
  return {
    total_sales_vatex: moneyString(totalSalesVatex),
    vat_amount: moneyString(vatAmount),
    total_sales_vatinc: moneyString(totalSalesVatinc),
    ewt_amount: moneyString(ewtAmount),
    total_after_ewt: moneyString(totalAfterEwt),
    deductions_total: moneyString(deductions),
    grand_total: moneyString(grandTotal),
  };
}

function cellStr(v) {
  if (v == null) return '';
  return String(v).replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
}

function parseCoverage(raw) {
  const text = cellStr(raw);
  if (!text) return { coverage_start: null, coverage_end: null, label: null };
  // Excel serial stored as coverage
  if (/^\d+(\.\d+)?$/.test(text)) {
    const iso = excelDateToIso(Number(text));
    return { coverage_start: iso, coverage_end: iso, label: iso };
  }
  return { coverage_start: null, coverage_end: null, label: text };
}

function loadRows(xlsxPath) {
  const wb = XLSX.readFile(xlsxPath);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });
  // Header row in this workbook is index 4
  let headerIdx = rows.findIndex(
    (r) =>
      Array.isArray(r) &&
      cellStr(r[0]).toUpperCase().includes('DATE BILLED') &&
      cellStr(r[1]).toUpperCase().includes('INVOICE'),
  );
  if (headerIdx < 0) headerIdx = 4;
  const out = [];
  for (const r of rows.slice(headerIdx + 1)) {
    if (!r || r[1] == null || !cellStr(r[2])) continue;
    const invoiceNo = cellStr(r[1]);
    if (!invoiceNo || !/^\d+/.test(invoiceNo)) continue;
    const status = cellStr(r[19]).toUpperCase() || 'UNPAID';
    const amount = Number(r[3]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const coverage = parseCoverage(r[20]);
    const deductionRaw = Number(r[8]);
    out.push({
      invoice_no: invoiceNo.match(/^\d+/)?.[0] ?? invoiceNo,
      client_name: cellStr(r[2]),
      invoice_date: excelDateToIso(r[0]),
      receiving_date: excelDateToIso(r[12]),
      due_date: excelDateToIso(r[13]),
      amount: roundMoney(amount),
      deduction:
        Number.isFinite(deductionRaw) && deductionRaw > 0 ? roundMoney(deductionRaw) : 0,
      payment_status: status === 'PAID' ? 'paid' : 'unpaid',
      acknowledgment_receipt_no: cellStr(r[17]) || null,
      billing_reference: coverage.label,
      coverage_start: coverage.coverage_start,
      coverage_end: coverage.coverage_end,
      remarks: cellStr(r[21]) || null,
      ewt_2307: cellStr(r[22]) || null,
    });
  }
  return out;
}

const invoices = loadRows(filePath);
console.log(`Parsed ${invoices.length} invoice rows from ${path.basename(filePath)}`);

const pool = new pg.Pool({
  connectionString: databaseUrl,
  // Live docker Postgres often uses a self-signed cert when sslmode=require.
  ssl: /sslmode=(require|verify-ca|verify-full)/i.test(databaseUrl)
    ? { rejectUnauthorized: false }
    : undefined,
});
const client = await pool.connect();

try {
  await client.query('BEGIN');
  let created = 0;
  let updated = 0;
  const clientsTouched = new Set();

  for (const inv of invoices) {
    let clientId;
    const existingClient = await client.query(
      `SELECT id FROM ar_clients WHERE lower(trim(name)) = lower(trim($1))`,
      [inv.client_name],
    );
    if (existingClient.rows[0]) {
      clientId = existingClient.rows[0].id;
    } else {
      const inserted = await client.query(
        `INSERT INTO ar_clients (name, active) VALUES ($1, TRUE) RETURNING id`,
        [inv.client_name],
      );
      clientId = inserted.rows[0].id;
    }
    clientsTouched.add(clientId);

    const ewtStatus =
      inv.ewt_2307 && /submit|release|yes|true|1/i.test(inv.ewt_2307)
        ? 'submitted'
        : 'pending';

    const existing = await client.query(
      `SELECT id FROM ar_summaries WHERE lower(trim(invoice_no)) = lower(trim($1)) FOR UPDATE`,
      [inv.invoice_no],
    );

    let summaryId;
    if (existing.rows[0]) {
      summaryId = existing.rows[0].id;
      await client.query(
        `UPDATE ar_summaries SET
           client_id = $2,
           billing_reference = $3,
           coverage_start = COALESCE($4, coverage_start),
           coverage_end = COALESCE($5, coverage_end),
           invoice_date = COALESCE($6, invoice_date),
           due_date = COALESCE($7, due_date),
           payment_status = $8,
           acknowledgment_receipt_no = COALESCE($9, acknowledgment_receipt_no),
           ewt_2307_status = CASE
             WHEN $10 = 'submitted' THEN 'submitted'
             ELSE ewt_2307_status
           END
         WHERE id = $1`,
        [
          summaryId,
          clientId,
          inv.billing_reference,
          inv.coverage_start,
          inv.coverage_end,
          inv.invoice_date,
          inv.due_date,
          inv.payment_status,
          inv.acknowledgment_receipt_no,
          ewtStatus,
        ],
      );
      await client.query(`DELETE FROM ar_detail_entries WHERE summary_id = $1`, [summaryId]);
      await client.query(`DELETE FROM ar_deductions WHERE summary_id = $1`, [summaryId]);
      updated += 1;
    } else {
      const inserted = await client.query(
        `INSERT INTO ar_summaries
           (invoice_no, client_id, billing_reference, coverage_start, coverage_end,
            invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id`,
        [
          inv.invoice_no,
          clientId,
          inv.billing_reference,
          inv.coverage_start,
          inv.coverage_end,
          inv.invoice_date,
          inv.due_date,
          inv.payment_status,
          inv.acknowledgment_receipt_no,
          ewtStatus,
        ],
      );
      summaryId = inserted.rows[0].id;
      created += 1;
    }

    const entryDate = inv.invoice_date ?? inv.receiving_date ?? inv.due_date;
    if (!entryDate) {
      throw new Error(`Invoice ${inv.invoice_no} has no usable date`);
    }

    await client.query(
      `INSERT INTO ar_detail_entries
         (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        summaryId,
        inv.invoice_no,
        entryDate,
        inv.invoice_date,
        inv.receiving_date,
        inv.remarks || 'N/A',
        'N/A',
        'N/A',
        inv.amount,
      ],
    );

    if (inv.deduction > 0) {
      await client.query(
        `INSERT INTO ar_deductions (summary_id, description, amount) VALUES ($1,$2,$3)`,
        [summaryId, 'Imported deduction / charges', inv.deduction],
      );
    }

    const totals = computeArTotals(inv.amount, inv.deduction);
    await client.query(
      `UPDATE ar_summaries SET
         total_sales_vatex = $2,
         vat_amount = $3,
         total_sales_vatinc = $4,
         ewt_amount = $5,
         total_after_ewt = $6,
         deductions_total = $7,
         grand_total = $8
       WHERE id = $1`,
      [
        summaryId,
        totals.total_sales_vatex,
        totals.vat_amount,
        totals.total_sales_vatinc,
        totals.ewt_amount,
        totals.total_after_ewt,
        totals.deductions_total,
        totals.grand_total,
      ],
    );
  }

  await client.query('COMMIT');
  console.log(
    `Done. created=${created} updated=${updated} clients=${clientsTouched.size} invoices=${invoices.length}`,
  );
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Seed failed:', err);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
