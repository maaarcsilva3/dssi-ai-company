// Proves the per-invoice PDC contract against a running server; deletes the payables it creates.
// Usage: node scripts/prove-pdc-per-invoice.mjs   (APP_URL, APP_USER, APP_PASS override defaults)
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

const amounts = (inv) => inv.pdc_lines.map((l) => l.amount);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const list = (x) => (Array.isArray(x) ? x : x.items);

/** The PUT body PayableFormPage builds from a GET: invoice ids echoed, PDC lines nested per invoice. */
function editBody(p, overrides = {}, invoiceOverrides = []) {
  return {
    client_id: p.client_id,
    payment_type_id: p.payment_type_id,
    payment_method_id: p.payment_method_id,
    status_id: p.status_id,
    apply_vat: p.apply_vat,
    apply_ewt: p.apply_ewt,
    description: p.description,
    is_draft: p.is_draft,
    invoices: p.invoices.map((inv, i) => ({
      id: inv.id,
      invoice_no: inv.invoice_no,
      invoice_date: inv.invoice_date?.slice(0, 10) ?? null,
      due_date: inv.due_date?.slice(0, 10) ?? null,
      payment_term_id: inv.payment_term_id,
      gross_amount: inv.gross_amount,
      pdc_lines: inv.pdc_lines.map(({ pdc_no, pdc_date, amount }) => ({ pdc_no, pdc_date, amount })),
      ...invoiceOverrides[i],
    })),
    ...overrides,
  };
}

const created = [];
try {
  const login = await call('POST', '/auth/login', { username: USER, password: PASS });
  if (login.status !== 200) throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);

  const methods = list((await call('GET', '/payment-methods')).body);
  const pdcMethod = methods.find((m) => /post dated|pdc/i.test(m.name));
  const checkMethod = methods.find((m) => m.name === 'Check');
  const type = list((await call('GET', '/payment-types')).body).find((t) => !/fuel/i.test(t.name));
  const supplier = list((await call('GET', '/clients')).body)[0];

  const tag = `PDCPROOF-${Date.now()}`;
  const invoice = (suffix, gross, pdc_lines) => ({
    invoice_no: `${tag}-${suffix}`,
    invoice_date: '2026-11-27',
    due_date: '2026-12-31',
    payment_term_id: null,
    gross_amount: gross,
    pdc_lines,
  });
  const header = {
    client_id: supplier.id,
    payment_type_id: type.id,
    payment_method_id: pdcMethod.id,
    apply_vat: false,
    apply_ewt: false,
    description: tag,
  };

  // 1. Draft, two invoices, each with its own schedule (comma amounts included).
  const create = await call('POST', '/payables', {
    ...header,
    is_draft: true,
    invoices: [
      invoice('A', '1,000.00', [
        { pdc_no: 'PDC-A1', pdc_date: '2026-12-01', amount: '400.00' },
        { pdc_no: 'PDC-A2', pdc_date: '2026-12-15', amount: '600' },
      ]),
      invoice('B', '2,500.50', [{ pdc_no: 'PDC-B1', pdc_date: '2026-12-20', amount: '2,500.50' }]),
    ],
  });
  check('draft create returns 201', create.status === 201, create.body);
  if (create.status !== 201) throw new Error('cannot continue without the draft payable');
  const id = create.body.id;
  created.push(id);

  let p = (await call('GET', `/payables/${id}`)).body;
  check('GET nests PDC lines under invoice A', same(amounts(p.invoices[0]), ['400.00', '600.00']), p.invoices[0]);
  check('GET nests PDC lines under invoice B', same(amounts(p.invoices[1]), ['2500.50']), p.invoices[1]);
  check('GET has no payable-level pdc_lines', !('pdc_lines' in p), Object.keys(p));

  // 2. Edit round-trip: the payload the form builds from GET, saved back as draft.
  const put1 = await call('PUT', `/payables/${id}`, editBody(p));
  check('draft edit round-trip returns 200', put1.status === 200, put1.body);
  p = (await call('GET', `/payables/${id}`)).body;
  check(
    'round-trip keeps every PDC value',
    same(amounts(p.invoices[0]), ['400.00', '600.00']) &&
      same(p.invoices[0].pdc_lines.map((l) => [l.pdc_no, l.pdc_date]), [
        ['PDC-A1', '2026-12-01'],
        ['PDC-A2', '2026-12-15'],
      ]) &&
      same(amounts(p.invoices[1]), ['2500.50']),
    p.invoices,
  );

  // 3. Draft save that omits A's lines and sends [] for B keeps both stored schedules.
  const put2 = await call('PUT', `/payables/${id}`, editBody(p, {}, [{ pdc_lines: undefined }, { pdc_lines: [] }]));
  check('draft save with omitted/empty lines returns 200', put2.status === 200, put2.body);
  p = (await call('GET', `/payables/${id}`)).body;
  check(
    'omitted/empty lines keep stored schedules',
    same(amounts(p.invoices[0]), ['400.00', '600.00']) && same(amounts(p.invoices[1]), ['2500.50']),
    p.invoices,
  );

  // 4. Submit where only the payable total balances: B is short, A is over.
  const bad = await call(
    'PUT',
    `/payables/${id}`,
    editBody(p, { is_draft: false }, [
      { pdc_lines: [{ amount: '1,500.50' }] },
      { pdc_lines: [{ amount: '2,000.00' }] },
    ]),
  );
  const badKeys = Object.keys(bad.body?.details?.fieldErrors ?? {}).sort();
  check(
    'submit rejects per-invoice mismatch even when payable total matches',
    bad.status === 400 && same(badKeys, ['invoices.0.pdc_lines', 'invoices.1.pdc_lines']),
    bad.body,
  );
  p = (await call('GET', `/payables/${id}`)).body;
  check('rejected submit leaves stored lines untouched', p.is_draft && same(amounts(p.invoices[1]), ['2500.50']), p);

  // 5. Balanced submit.
  const good = await call(
    'PUT',
    `/payables/${id}`,
    editBody(p, { is_draft: false }, [{}, { pdc_lines: [{ amount: '1,000.25' }, { amount: '1500.25' }] }]),
  );
  check('balanced submit returns 200', good.status === 200, good.body);
  p = (await call('GET', `/payables/${id}`)).body;
  check(
    'submitted payable shows both schedules',
    !p.is_draft && same(amounts(p.invoices[0]), ['400.00', '600.00']) && same(amounts(p.invoices[1]), ['1000.25', '1500.25']),
    p.invoices,
  );
  check('list pdc_count counts all invoices', p.pdc_count === 4, p.pdc_count);

  // 6. Status PATCH carries per-invoice lines; omitted invoices keep theirs.
  const [a, b] = p.invoices;
  const patch = await call('PATCH', `/payables/${id}/status`, {
    status_id: p.status_id,
    invoices: [{ id: a.id, pdc_lines: [{ pdc_no: 'PDC-A-ONE', amount: '1,000.00' }] }],
  });
  check('status PATCH with invoice lines returns 200', patch.status === 200, patch.body);
  p = (await call('GET', `/payables/${id}`)).body;
  check(
    'PATCH replaced A only',
    same(amounts(p.invoices[0]), ['1000.00']) && same(amounts(p.invoices[1]), ['1000.25', '1500.25']),
    p.invoices,
  );
  const patchBad = await call('PATCH', `/payables/${id}/status`, {
    status_id: p.status_id,
    invoices: [{ id: p.invoices[0].id, pdc_lines: [{ amount: '999.00' }] }],
  });
  check('PATCH rejects unbalanced invoice', patchBad.status === 400, patchBad.body);
  const patchStale = await call('PATCH', `/payables/${id}/status`, {
    status_id: p.status_id,
    invoices: [{ id: b.id + 1_000_000, pdc_lines: [{ amount: '1.00' }] }],
  });
  check('PATCH rejects an invoice id from elsewhere', patchStale.status === 400, patchStale.body);

  // 7. Removing invoice A must not hand A's lines to B.
  const remove = await call('PUT', `/payables/${id}`, {
    ...editBody(p),
    invoices: editBody(p).invoices.slice(1).map((inv) => ({ ...inv, pdc_lines: undefined })),
  });
  check('removing invoice A returns 200', remove.status === 200, remove.body);
  p = (await call('GET', `/payables/${id}`)).body;
  check(
    'B keeps its own lines after A is removed',
    p.invoices.length === 1 && same(amounts(p.invoices[0]), ['1000.25', '1500.25']),
    p.invoices,
  );

  // 8. Switching to a non-PDC method drops the schedule.
  const toCheck = await call('PUT', `/payables/${id}`, editBody(p, { payment_method_id: checkMethod.id }));
  check('switch to Check returns 200', toCheck.status === 200, toCheck.body);
  p = (await call('GET', `/payables/${id}`)).body;
  check('non-PDC payable has no PDC lines', p.invoices.every((inv) => inv.pdc_lines.length === 0) && p.pdc_count === 0, p);

  // 9. Separate-payable-per-invoice create keeps each invoice's schedule on its own payable.
  const batch = await call('POST', '/payables/batch', {
    ...header,
    is_draft: true,
    invoices: [
      invoice('S1', '300.00', [{ pdc_no: 'S1-1', amount: '300' }]),
      invoice('S2', '700.00', [{ pdc_no: 'S2-1', amount: '350' }, { pdc_no: 'S2-2', amount: '350' }]),
    ],
  });
  check('batch create returns 201', batch.status === 201, batch.body);
  for (const item of batch.body?.items ?? []) created.push(item.id);
  const [s1, s2] = await Promise.all(batch.body.items.map((it) => call('GET', `/payables/${it.id}`)));
  check(
    'batch payables each own their invoice schedule',
    same(amounts(s1.body.invoices[0]), ['300.00']) && same(amounts(s2.body.invoices[0]), ['350.00', '350.00']),
    [s1.body.invoices, s2.body.invoices],
  );

  // 10. Legacy rows after migration 036.
  const p131 = (await call('GET', '/payables/131')).body;
  check(
    '#131 edit data carries pdc1 on its invoice',
    p131.invoices?.[0]?.pdc_lines?.[0]?.pdc_no === 'pdc1' && p131.invoices[0].pdc_lines[0].amount === '49107.14',
    p131.invoices,
  );
  const p132 = (await call('GET', '/payables/132')).body;
  console.log(`INFO #132 invoice PDC lines stored: ${p132.invoices?.[0]?.pdc_lines?.length ?? 'n/a'}`);
} finally {
  for (const payableId of created) await call('DELETE', `/payables/${payableId}`);
  console.log(`cleanup: deleted ${created.length} proof payable(s)`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
