import * as XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('data/unpaid-payables.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], {
  header: 1,
  defval: null,
  raw: true,
});

function money(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v * 100) / 100;
  const s = String(v).replace(/,/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function asDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    const parsed = XLSX.SSF?.parse_date_code?.(v);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(epoch.getTime() + v * 86400000);
    return dt.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m) {
    const months = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const mon = months[m[2]];
    if (!mon) return null;
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    return `${year}-${mon}-${String(m[1]).padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function sqlStr(s) {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlNum(n) {
  if (n == null) return 'NULL';
  return Number(n).toFixed(2);
}

const data = [];
for (const r of rows.slice(6)) {
  if (!r) continue;
  const invoiceNo = r[3] == null ? '' : String(r[3]).trim();
  const supplier = r[4] == null ? '' : String(r[4]).trim();
  const status = r[21] == null ? '' : String(r[21]).trim().toUpperCase();
  if (!invoiceNo || !supplier || status !== 'UNPAID') continue;
  const gross = money(r[5]) ?? 0;
  const vat = money(r[6]) ?? 0;
  const ewt = money(r[8]) ?? 0;
  const amount = money(r[9]) ?? 0;
  if (!(amount > 0) && !(gross > 0)) continue;
  const termRaw = r[12] == null ? '' : String(r[12]).trim();
  let termDays = null;
  if (/immediate/i.test(termRaw)) termDays = 0;
  else if (/^\d+$/.test(termRaw)) termDays = Number(termRaw);
  const invoiceDate = asDate(r[1]);
  let dueDate = asDate(r[13]);
  if (!dueDate) dueDate = invoiceDate;
  data.push({
    invoiceNo,
    supplier,
    invoiceDate,
    dueDate,
    termDays,
    gross: gross > 0 ? gross : amount,
    vat,
    ewt,
    amount: amount > 0 ? amount : gross,
  });
}

console.log('parsed', data.length);

const suppliers = [...new Set(data.map((d) => d.supplier))].sort();
const seenInv = new Map();
function uniqueInvoiceNo(inv, due) {
  const key = inv.toLowerCase();
  const n = (seenInv.get(key) ?? 0) + 1;
  seenInv.set(key, n);
  if (n === 1) return inv;
  return due ? `${inv} (${due})` : `${inv} (#${n})`;
}

function inferType(name) {
  const n = name.toLowerCase();
  if (n.includes('cartrack') || n.includes('security') || n.includes('service')) return 'Services';
  if (n.includes('fuel') || n.includes('lube')) return 'Fuel';
  return 'Supplies';
}

function inferEwtKind(ewt, gross, vat) {
  if (!(ewt > 0)) return null;
  const netSales = Math.max(0, Math.round((gross - vat) * 100) / 100);
  const base = netSales > 0 ? netSales : gross;
  const p1 = base * 0.01;
  const p2 = base * 0.02;
  return Math.abs(ewt - p1) <= Math.abs(ewt - p2) ? 'products' : 'service';
}

const lines = [];
lines.push(`-- Seed unpaid payables from UNPAID PAYABLES.xlsx (JPA Freight Logistics AP 2026).`);
lines.push(`-- Idempotent: replaces prior seed batch tagged in description.`);
lines.push(``);
lines.push(`-- Ensure 120-day payment term exists.`);
lines.push(`INSERT INTO payment_terms (name, days, active)`);
lines.push(`SELECT '120', 120, TRUE`);
lines.push(` WHERE NOT EXISTS (SELECT 1 FROM payment_terms WHERE days = 120);`);
lines.push(``);
lines.push(`-- Ensure suppliers exist.`);
lines.push(`INSERT INTO clients (name)`);
lines.push(`SELECT v.name`);
lines.push(`  FROM (VALUES`);
lines.push(suppliers.map((s) => `    (${sqlStr(s)})`).join(',\n'));
lines.push(`  ) AS v(name)`);
lines.push(` WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE lower(c.name) = lower(v.name));`);
lines.push(``);
lines.push(`-- Remove previous seed batch (cascades invoices/history).`);
lines.push(`DELETE FROM payables WHERE description = '[seed: unpaid payables]';`);
lines.push(``);
lines.push(`DO $$`);
lines.push(`DECLARE`);
lines.push(`  v_status_id INTEGER;`);
lines.push(`  v_method_id INTEGER;`);
lines.push(`  v_type_id INTEGER;`);
lines.push(`  v_term_id INTEGER;`);
lines.push(`  v_client_id INTEGER;`);
lines.push(`  v_payable_id INTEGER;`);
lines.push(`  r RECORD;`);
lines.push(`BEGIN`);
lines.push(`  SELECT id INTO v_status_id FROM payable_statuses`);
lines.push(`   WHERE active AND lower(name) = 'for review' ORDER BY id LIMIT 1;`);
lines.push(`  IF v_status_id IS NULL THEN`);
lines.push(`    RAISE EXCEPTION 'Missing payable status For review';`);
lines.push(`  END IF;`);
lines.push(`  SELECT id INTO v_method_id FROM payment_methods`);
lines.push(`   WHERE active AND lower(name) = 'check' ORDER BY id LIMIT 1;`);
lines.push(`  IF v_method_id IS NULL THEN`);
lines.push(`    RAISE EXCEPTION 'Missing payment method Check';`);
lines.push(`  END IF;`);
lines.push(``);

for (const [i, d] of data.entries()) {
  const invUnique = uniqueInvoiceNo(d.invoiceNo, d.dueDate);
  const ewtKind = inferEwtKind(d.ewt, d.gross, d.vat);
  const applyVat = d.vat > 0;
  const applyEwt = d.ewt > 0;
  const typeName = inferType(d.supplier);
  const due = d.dueDate ?? d.invoiceDate ?? '2026-11-17';
  const ewtRate = ewtKind === 'products' ? 1 : ewtKind === 'service' ? 2 : null;

  lines.push(`  -- ${i + 1}. ${d.supplier} / ${d.invoiceNo}`);
  lines.push(`  SELECT id INTO v_client_id FROM clients WHERE lower(name) = lower(${sqlStr(d.supplier)}) LIMIT 1;`);
  lines.push(`  SELECT id INTO v_type_id FROM payment_types WHERE lower(name) = lower(${sqlStr(typeName)}) LIMIT 1;`);
  if (d.termDays == null) {
    lines.push(`  v_term_id := NULL;`);
  } else {
    lines.push(`  SELECT id INTO v_term_id FROM payment_terms WHERE days = ${d.termDays} AND active ORDER BY id LIMIT 1;`);
  }
  lines.push(`  INSERT INTO payables (`);
  lines.push(`    client_id, payment_type_id, payment_method_id, payment_term_id,`);
  lines.push(`    invoice_no, invoice_date, due_date,`);
  lines.push(`    amount, gross_amount, apply_vat, vat_rate, vat_amount,`);
  lines.push(`    apply_ewt, ewt_kind, ewt_rate, ewt_amount,`);
  lines.push(`    description, status_id, is_draft`);
  lines.push(`  ) VALUES (`);
  lines.push(`    v_client_id, v_type_id, v_method_id, v_term_id,`);
  lines.push(`    ${sqlStr(d.invoiceNo)}, ${sqlStr(d.invoiceDate)}::date, ${sqlStr(due)}::date,`);
  lines.push(`    ${sqlNum(d.amount)}, ${sqlNum(d.gross)}, ${applyVat}, 12, ${sqlNum(d.vat)},`);
  lines.push(`    ${applyEwt}, ${sqlStr(ewtKind)}, ${ewtRate == null ? 'NULL' : ewtRate}, ${sqlNum(d.ewt)},`);
  lines.push(`    '[seed: unpaid payables]', v_status_id, FALSE`);
  lines.push(`  ) RETURNING id INTO v_payable_id;`);
  lines.push(`  INSERT INTO payable_invoices (`);
  lines.push(`    payable_id, invoice_no, invoice_date, gross_amount, vat_amount, ewt_amount, net_amount,`);
  lines.push(`    sort_order, payment_term_id, due_date`);
  lines.push(`  ) VALUES (`);
  lines.push(`    v_payable_id, ${sqlStr(invUnique)}, ${sqlStr(d.invoiceDate)}::date,`);
  lines.push(`    ${sqlNum(d.gross)}, ${sqlNum(d.vat)}, ${sqlNum(d.ewt)}, ${sqlNum(d.amount)},`);
  lines.push(`    0, v_term_id, ${sqlStr(due)}::date`);
  lines.push(`  );`);
  lines.push(`  INSERT INTO payable_status_history (payable_id, from_status_id, to_status_id, remarks)`);
  lines.push(`  VALUES (v_payable_id, NULL, v_status_id, 'Seeded from UNPAID PAYABLES.xlsx');`);
  lines.push(``);
}

lines.push(`END $$;`);

const out = 'migrations/029_seed_unpaid_payables.sql';
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log('wrote', out, 'bytes', fs.statSync(out).size, 'rows', data.length);
