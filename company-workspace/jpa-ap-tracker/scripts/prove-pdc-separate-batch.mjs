// Proves PDC modes on POST /payables/batch (separate payable per invoice on create).
// Usage: node scripts/prove-pdc-separate-batch.mjs
const BASE = process.env.APP_URL ?? 'http://localhost:8080';
const USER = process.env.APP_USER ?? 'admin';
const PASS = process.env.APP_PASS ?? 'admin123';

let cookie = '';
async function call(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : `\n     ${JSON.stringify(detail)}`}`);
  if (!ok) failures += 1;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const list = (x) => (Array.isArray(x) ? x : x.items);
const pdcHead = (inv) => inv.pdc_lines.map((l) => [l.pdc_no, l.pdc_date?.slice(0, 10), l.amount]);

const created = [];
try {
  const login = await call('POST', '/auth/login', { username: USER, password: PASS });
  check('login', login.status === 200, login.body);

  const pdcMethod = list((await call('GET', '/payment-methods')).body).find((m) => /post dated|pdc/i.test(m.name));
  const type = list((await call('GET', '/payment-types')).body).find((t) => !/fuel/i.test(t.name));
  const client = list((await call('GET', '/clients')).body)[0];
  check('fixtures', Boolean(client && pdcMethod && type), { client, pdcMethod, type });

  const header = {
    client_id: client.id,
    payment_type_id: type.id,
    payment_method_id: pdcMethod.id,
    apply_vat: false,
    apply_ewt: false,
    is_draft: true,
    description: `PDC-BATCH-PROOF-${Date.now()}`,
  };

  const line = (no, gross, pdc_lines) => ({
    invoice_no: no,
    gross_amount: gross,
    due_date: '2026-06-01',
    pdc_group: null,
    pdc_lines,
  });

  // Mode B — one check, each payable gets one line for its net.
  const batchB = await call('POST', '/payables/batch', {
    ...header,
    invoices: [
      line('B1', '1000.00', [{ pdc_no: 'SHARED-9', pdc_date: '2026-12-01', amount: '1000.00' }]),
      line('B2', '500.00', [{ pdc_no: 'SHARED-9', pdc_date: '2026-12-01', amount: '500.00' }]),
      line('B3', '250.50', [{ pdc_no: 'SHARED-9', pdc_date: '2026-12-01', amount: '250.50' }]),
    ],
  });
  check('mode B batch create 201', batchB.status === 201 && batchB.body?.count === 3, batchB.body);
  for (const item of batchB.body?.items ?? []) created.push(item.id);

  const modeBGets = await Promise.all(batchB.body.items.map((it) => call('GET', `/payables/${it.id}`)));
  const bHeads = modeBGets.map((g) => pdcHead(g.body.invoices[0]));
  check(
    'mode B same pdc no/date, amounts match nets',
    bHeads.every((h) => h[0]?.[0] === 'SHARED-9' && h[0]?.[1] === '2026-12-01') &&
      same(
        bHeads.map((h) => h[0]?.[2]),
        ['1000.00', '500.00', '250.50'],
      ),
    bHeads,
  );
  const bSum = modeBGets.reduce((acc, g) => acc + Number(g.body.invoices[0].pdc_lines[0].amount), 0);
  check('mode B line amounts sum to 1750.50', Math.abs(bSum - 1750.5) < 0.02, bSum);
  check(
    'mode B shared_pdc_batch link',
  modeBGets.every(
    (g) =>
      g.body.shared_pdc_batch?.id &&
      g.body.shared_pdc_batch.members?.length === 3 &&
      g.body.shared_pdc_batch.amount_total === '1750.50',
  ),
    modeBGets.map((g) => g.body.shared_pdc_batch),
  );

  // Mode A — distinct schedules per payable.
  const batchA = await call('POST', '/payables/batch', {
    ...header,
    invoices: [
      line('A1', '600.00', [
        { pdc_no: 'A1-1', pdc_date: '2026-11-01', amount: '300.00' },
        { pdc_no: 'A1-2', pdc_date: '2026-11-15', amount: '300.00' },
      ]),
      line('A2', '400.00', [{ pdc_no: 'A2-1', pdc_date: '2026-11-20', amount: '400.00' }]),
    ],
  });
  check('mode A batch create 201', batchA.status === 201 && batchA.body?.count === 2, batchA.body);
  for (const item of batchA.body?.items ?? []) created.push(item.id);
  const [a1, a2] = await Promise.all(batchA.body.items.map((it) => call('GET', `/payables/${it.id}`)));
  check(
    'mode A distinct schedules',
    pdcHead(a1.body.invoices[0]).length === 2 && pdcHead(a2.body.invoices[0])[0]?.[0] === 'A2-1',
    [pdcHead(a1.body.invoices[0]), pdcHead(a2.body.invoices[0])],
  );

  const badGroup = await call('POST', '/payables/batch', {
    ...header,
    invoices: [line('X', '100', []), { ...line('Y', '100', []), pdc_group: 'ghost' }],
  });
  check('batch rejects pdc_group', badGroup.status === 400, badGroup.body);
} finally {
  for (const payableId of created) await call('DELETE', `/payables/${payableId}`);
  console.log(`cleanup: deleted ${created.length} proof payable(s)`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);