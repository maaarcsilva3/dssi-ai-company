// Proves cross-payable shared PDC batch link on create + edit.
// Usage: node scripts/prove-pdc-shared-batch-link.mjs
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

const list = (x) => (Array.isArray(x) ? x : x.items);
const pdcHead = (inv) => inv.pdc_lines?.map((l) => [l.pdc_no, l.pdc_date?.slice(0, 10), l.amount]) ?? [];

const created = [];
try {
  const login = await call('POST', '/auth/login', { username: USER, password: PASS });
  check('login', login.status === 200, login.body);

  const pdcMethod = list((await call('GET', '/payment-methods')).body).find((m) => /post dated|pdc/i.test(m.name));
  const type = list((await call('GET', '/payment-types')).body).find((t) => !/fuel/i.test(t.name));
  const client = list((await call('GET', '/clients')).body)[0];
  const openStatus = list((await call('GET', '/statuses')).body).find((s) => s.category === 'open');
  check('fixtures', Boolean(client && pdcMethod && type && openStatus), { client, pdcMethod, type, openStatus });

  const header = {
    client_id: client.id,
    payment_type_id: type.id,
    payment_method_id: pdcMethod.id,
    apply_vat: false,
    apply_ewt: false,
    is_draft: true,
    status_id: openStatus.id,
    description: `PDC-SHARED-LINK-${Date.now()}`,
  };

  const line = (no, gross) => ({
    invoice_no: no,
    gross_amount: gross,
    due_date: '2026-06-01',
    pdc_group: null,
    pdc_lines: [{ pdc_no: 'LINK-CHK-1', pdc_date: '2026-12-01', amount: gross }],
  });

  const batch = await call('POST', '/payables/batch', {
    ...header,
    invoices: [line('L1', '1000.00'), line('L2', '500.00')],
  });
  check('batch create 201', batch.status === 201 && batch.body?.count === 2, batch.body);
  const [id1, id2] = (batch.body?.items ?? []).map((it) => it.id);
  created.push(id1, id2);

  const g1 = await call('GET', `/payables/${id1}`);
  const batchMeta = g1.body?.shared_pdc_batch;
  check(
    'GET payable1 has batch + 2 members',
    Boolean(batchMeta?.id && batchMeta.members?.length === 2 && batchMeta.amount_total === '1500.00'),
    batchMeta,
  );

  const put = await call('PUT', `/payables/${id1}`, {
    ...header,
    invoices: [
      {
        invoice_no: 'L1',
        gross_amount: '1000.00',
        due_date: '2026-06-01',
        pdc_lines: [{ pdc_no: 'LINK-CHK-9', pdc_date: '2026-12-15', amount: '1000.00' }],
      },
    ],
    shared_pdc_batch: { pdc_no: 'LINK-CHK-9', pdc_date: '2026-12-15' },
  });
  check('PUT payable1 updates shared check', put.status === 200, put.body);

  const g2 = await call('GET', `/payables/${id2}`);
  const head2 = pdcHead(g2.body?.invoices?.[0])[0];
  check(
    'GET payable2 new no/date and amount = net',
    head2?.[0] === 'LINK-CHK-9' && head2?.[1] === '2026-12-15' && head2?.[2] === '500.00',
    head2,
  );
  check(
    'payable2 batch total still 1500',
    g2.body?.shared_pdc_batch?.amount_total === '1500.00',
    g2.body?.shared_pdc_batch,
  );

  const unlink = await call('PUT', `/payables/${id2}`, {
    ...header,
    shared_pdc_batch: null,
    invoices: [
      {
        invoice_no: 'L2',
        gross_amount: '500.00',
        due_date: '2026-06-01',
        pdc_lines: [{ pdc_no: 'OWN', pdc_date: '2026-12-01', amount: '500.00' }],
      },
    ],
  });
  check('unlink attempt rejected', unlink.status === 403, unlink.body);
} finally {
  for (const payableId of created) await call('DELETE', `/payables/${payableId}`);
  console.log(`cleanup: deleted ${created.length} proof payable(s)`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);