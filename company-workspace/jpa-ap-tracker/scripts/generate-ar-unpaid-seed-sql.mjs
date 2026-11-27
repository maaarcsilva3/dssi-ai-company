#!/usr/bin/env node
/**
 * Regenerate migrations/034_seed_ar_unpaid_invoices.sql from seeds/ar-unpaid-invoices.xlsx
 *   node scripts/generate-ar-unpaid-seed-sql.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const xlsxPath = process.argv[2] || path.join(root, 'seeds/ar-unpaid-invoices.xlsx');
const outPath = path.join(root, 'migrations/034_seed_ar_unpaid_invoices.sql');

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
function sqlStr(v) {
  if (v == null || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlDate(v) {
  return v ? `'${v}'::date` : 'NULL';
}
function sqlNum(v) {
  return moneyString(v);
}

const wb = XLSX.readFile(xlsxPath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
const headerIdx = rows.findIndex(
  (r) =>
    Array.isArray(r) &&
    cellStr(r[0]).toUpperCase().includes('DATE BILLED') &&
    cellStr(r[1]).toUpperCase().includes('INVOICE'),
);
const invoices = [];
for (const r of rows.slice(headerIdx + 1)) {
  if (!r || r[1] == null || !cellStr(r[2])) continue;
  const invoiceNo = cellStr(r[1]);
  if (!invoiceNo || !/^\d+/.test(invoiceNo)) continue;
  const amount = Number(r[3]);
  if (!Number.isFinite(amount) || amount <= 0) continue;
  const status = cellStr(r[19]).toUpperCase() || 'UNPAID';
  const covText = cellStr(r[20]);
  let coverageLabel = null;
  let coverageStart = null;
  let coverageEnd = null;
  if (covText) {
    if (/^\d+(\.\d+)?$/.test(covText)) {
      const iso = excelDateToIso(Number(covText));
      coverageStart = iso;
      coverageEnd = iso;
      coverageLabel = iso;
    } else {
      coverageLabel = covText;
    }
  }
  const deductionRaw = Number(r[8]);
  invoices.push({
    invoice_no: invoiceNo.match(/^\d+/)?.[0] ?? invoiceNo,
    client_name: cellStr(r[2]),
    invoice_date: excelDateToIso(r[0]),
    receiving_date: excelDateToIso(r[12]),
    due_date: excelDateToIso(r[13]),
    amount: roundMoney(amount),
    deduction: Number.isFinite(deductionRaw) && deductionRaw > 0 ? roundMoney(deductionRaw) : 0,
    payment_status: status === 'PAID' ? 'paid' : 'unpaid',
    acknowledgment_receipt_no: cellStr(r[17]) || null,
    billing_reference: coverageLabel,
    coverage_start: coverageStart,
    coverage_end: coverageEnd,
    remarks: cellStr(r[21]) || null,
    ewt_2307: cellStr(r[22]) || null,
  });
}

const clients = [...new Set(invoices.map((i) => i.client_name))].sort((a, b) => a.localeCompare(b));
const invoiceNos = invoices.map((i) => i.invoice_no);

let sql = '';
sql += `-- Seed AR unpaid invoices from seeds/ar-unpaid-invoices.xlsx\n`;
sql += `-- (Accounts Receivable - Unpaid Invoices). Idempotent: replaces prior seed batch.\n`;
sql += `-- Each invoice gets one billing detail line (same fields as Add detail line).\n`;
sql += `-- Regenerate: node scripts/generate-ar-unpaid-seed-sql.mjs\n\n`;

sql += `-- Ensure clients exist.\n`;
sql += `INSERT INTO ar_clients (name, active)\n`;
sql += `SELECT v.name, TRUE\n`;
sql += `  FROM (VALUES\n`;
sql += clients.map((c) => `    (${sqlStr(c)})`).join(',\n');
sql += `\n  ) AS v(name)\n`;
sql += ` WHERE NOT EXISTS (\n`;
sql += `   SELECT 1 FROM ar_clients c WHERE lower(trim(c.name)) = lower(trim(v.name))\n`;
sql += ` );\n\n`;

sql += `-- Remove prior seed batch for these invoice numbers (cascades details/deductions).\n`;
sql += `DELETE FROM ar_summaries\n`;
sql += ` WHERE lower(trim(invoice_no)) IN (\n`;
sql += invoiceNos.map((n) => `   lower(trim(${sqlStr(n)}))`).join(',\n');
sql += `\n );\n\n`;

sql += `DO $$\n`;
sql += `DECLARE\n`;
sql += `  v_client_id INTEGER;\n`;
sql += `  v_summary_id INTEGER;\n`;
sql += `BEGIN\n`;

for (const inv of invoices) {
  const entryDate = inv.invoice_date ?? inv.receiving_date ?? inv.due_date;
  if (!entryDate) throw new Error(`No date for invoice ${inv.invoice_no}`);
  const totals = computeArTotals(inv.amount, inv.deduction);
  const ewtStatus =
    inv.ewt_2307 && /submit|release|yes|true|1/i.test(inv.ewt_2307) ? 'submitted' : 'pending';
  const ref = inv.remarks
    ? `[seed: ar unpaid] ${inv.remarks}`.slice(0, 2000)
    : '[seed: ar unpaid]';

  sql += `\n  -- Invoice ${inv.invoice_no} · ${inv.client_name}\n`;
  sql += `  SELECT id INTO v_client_id FROM ar_clients\n`;
  sql += `   WHERE lower(trim(name)) = lower(trim(${sqlStr(inv.client_name)})) LIMIT 1;\n`;
  sql += `  IF v_client_id IS NULL THEN\n`;
  sql += `    RAISE EXCEPTION 'Missing AR client %', ${sqlStr(inv.client_name)};\n`;
  sql += `  END IF;\n\n`;
  sql += `  INSERT INTO ar_summaries\n`;
  sql += `    (invoice_no, client_id, billing_reference, coverage_start, coverage_end,\n`;
  sql += `     invoice_date, due_date, payment_status, acknowledgment_receipt_no, ewt_2307_status,\n`;
  sql += `     total_sales_vatex, vat_amount, total_sales_vatinc, ewt_amount,\n`;
  sql += `     total_after_ewt, deductions_total, grand_total)\n`;
  sql += `  VALUES (\n`;
  sql += `    ${sqlStr(inv.invoice_no)}, v_client_id, ${sqlStr(inv.billing_reference)},\n`;
  sql += `    ${sqlDate(inv.coverage_start)}, ${sqlDate(inv.coverage_end)},\n`;
  sql += `    ${sqlDate(inv.invoice_date)}, ${sqlDate(inv.due_date)},\n`;
  sql += `    ${sqlStr(inv.payment_status)}, ${sqlStr(inv.acknowledgment_receipt_no)}, ${sqlStr(ewtStatus)},\n`;
  sql += `    ${totals.total_sales_vatex}, ${totals.vat_amount}, ${totals.total_sales_vatinc}, ${totals.ewt_amount},\n`;
  sql += `    ${totals.total_after_ewt}, ${totals.deductions_total}, ${totals.grand_total}\n`;
  sql += `  ) RETURNING id INTO v_summary_id;\n\n`;
  sql += `  INSERT INTO ar_detail_entries\n`;
  sql += `    (summary_id, invoice_no, entry_date, billing_date, receiving_date, reference, origin, destination, amount)\n`;
  sql += `  VALUES (\n`;
  sql += `    v_summary_id, ${sqlStr(inv.invoice_no)}, ${sqlDate(entryDate)},\n`;
  sql += `    ${sqlDate(inv.invoice_date)}, ${sqlDate(inv.receiving_date)},\n`;
  sql += `    ${sqlStr(ref)}, 'N/A', 'N/A', ${sqlNum(inv.amount)}\n`;
  sql += `  );\n`;
  if (inv.deduction > 0) {
    sql += `  INSERT INTO ar_deductions (summary_id, description, amount)\n`;
    sql += `  VALUES (v_summary_id, '[seed: ar unpaid] Imported deduction / charges', ${sqlNum(inv.deduction)});\n`;
  }
}

sql += `\nEND $$;\n`;

fs.writeFileSync(outPath, sql);
console.log(`Wrote ${path.relative(root, outPath)} (${invoices.length} invoices, ${clients.length} clients)`);
