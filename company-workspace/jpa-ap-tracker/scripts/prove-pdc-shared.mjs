// Proves the mixed PDC contract (own schedules beside shared single-check PDCs) against a running server.
// Deletes the payables it creates. Usage: node scripts/prove-pdc-shared.mjs   (APP_URL, APP_USER, APP_PASS)
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
const get = async (id) => (await call('GET', `/payables/${id}`)).body;

/** The shape a reader cares about: own lines per invoice, and which invoices share which check. */
function pdcShape(p) {
  const groupNo = new Map(p.pdc_groups.map((g, i) => [g.key, i]));
  return {
    invoices: p.invoices.map((inv) => ({
      no: inv.invoice_no.split('-').pop(),
      own: inv.pdc_lines.map((l) => [l.pdc_no, l.pdc_date, l.amount]),
      shared: inv.pdc_group == null ? null : groupNo.get(inv.pdc_group),
    })),
    groups: p.pdc_groups.map((g) => ({
      pdc_no: g.pdc_no,
      pdc_date: g.pdc_date,
      amount: g.amount,
      invoices: g.invoice_ids.map((id) => p.invoices.find((inv) => inv.id === id).invoice_no.split('-').pop()),
    })),
  };
}

/** The PUT body PayableFormPage builds from a GET: ids echoed, own lines or the shared key per invoice. */
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
      ...(inv.pdc_group
        ? { pdc_group: inv.pdc_group }
        : { pdc_group: null, pdc_lines: inv.pdc_lines.map(({ pdc_no, pdc_date, amount }) => ({ pdc_no, pdc_date, amount })) }),
      ...invoiceOverrides[i],
    })),
    pdc_groups: p.pdc_groups.map(({ key, pdc_no, pdc_date }) => ({ key, pdc_no, pdc_date })),
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

  const tag = `PDCSHARED-${Date.now()}`;
  const invoice = (suffix, gross, pdc) => ({
    invoice_no: `${tag}-${suffix}`,
    invoice_date: '2026-11-27',
    due_date: '2026-12-31',
    payment_term_id: null,
    gross_amount: gross,
    ...pdc,
  });
  const header = {
    client_id: supplier.id,
    payment_type_id: type.id,
    payment_method_id: pdcMethod.id,
    apply_vat: false,
    apply_ewt: false,
    description: tag,
  };

  // 1. One payable, three invoices: 1 has its own two PDCs; 2 and 3 share one check.
  const create = await call('POST', '/payables', {
    ...header,
    is_draft: true,
    invoices: [
      invoice('1', '1,000.00', {
        pdc_lines: [
          { pdc_no: 'OWN-1', pdc_date: '2026-12-01', amount: '400' },
          { pdc_no: 'OWN-2', pdc_date: '2026-12-15', amount: '600.00' },
        ],
      }),
      invoice('2', '250.50', { pdc_group: 'new-a' }),
      invoice('3', '749.50', { pdc_group: 'new-a' }),
    ],
    pdc_groups: [{ key: 'new-a', pdc_no: 'SHARED-1', pdc_date: '2026-12-20' }],
  });
  check('draft create with mixed PDC returns 201', create.status === 201, create.body);
  if (create.status !== 201) throw new Error('cannot continue without the payable');
  const id = create.body.id;
  created.push(id);

  const expected = {
    invoices: [
      { no: '1', own: [['OWN-1', '2026-12-01', '400.00'], ['OWN-2', '2026-12-15', '600.00']], shared: null },
      { no: '2', own: [], shared: 0 },
      { no: '3', own: [], shared: 0 },
    ],
    groups: [{ pdc_no: 'SHARED-1', pdc_date: '2026-12-20', amount: '1000.00', invoices: ['2', '3'] }],
  };
  let p = await get(id);
  check('GET shows own lines on 1 and one shared check (= sum of nets) on 2+3', same(pdcShape(p), expected), pdcShape(p));
  check('list pdc_count counts 2 own + 1 shared check', p.pdc_count === 3, p.pdc_count);

  // 2. Edit round-trip: the form's body built from GET, submitted. Shared invoices need no lines to pass.
  const submit = await call('PUT', `/payables/${id}`, editBody(p, { is_draft: false }));
  check('submit of the echoed GET returns 200', submit.status === 200, submit.body);
  p = await get(id);
  check('reload after submit shows the same mix', !p.is_draft && same(pdcShape(p), expected), pdcShape(p));

  // 3. A body that omits every PDC field (or sends empty lines) keeps both shapes.
  const bare = editBody(p, { pdc_groups: undefined }, p.invoices.map(() => ({ pdc_group: undefined, pdc_lines: [] })));
  const keep = await call('PUT', `/payables/${id}`, bare);
  check('PUT without PDC fields returns 200', keep.status === 200, keep.body);
  p = await get(id);
  check('omitted/empty PDC fields wipe neither own lines nor the shared check', same(pdcShape(p), expected), pdcShape(p));

  // 4. Illegal requests.
  const both = await call('PUT', `/payables/${id}`, editBody(p, {}, [{}, { pdc_lines: [{ amount: '250.50' }] }]));
  check('an invoice with a shared key and own lines is rejected', both.status === 400, both.body);
  const ghost = await call('PUT', `/payables/${id}`, editBody(p, { pdc_groups: [] }, [{}, { pdc_group: 'ghost' }, { pdc_group: 'ghost' }]));
  check('an unknown shared key is rejected', ghost.status === 400 && 'invoices.1.pdc_group' in (ghost.body?.details?.fieldErrors ?? {}), ghost.body);
  const short = await call('PUT', `/payables/${id}`, editBody(p, {}, [{ pdc_lines: [{ amount: '999' }] }]));
  check(
    'submit still checks own schedules beside a shared check',
    short.status === 400 && same(Object.keys(short.body?.details?.fieldErrors ?? {}), ['invoices.0.pdc_lines']),
    short.body,
  );
  p = await get(id);
  check('rejected requests leave the stored mix untouched', same(pdcShape(p), expected), pdcShape(p));

  // 5. The shared amount follows the invoices' nets; a second shared check joins with two new invoices.
  const grow = await call('PUT', `/payables/${id}`, {
    ...editBody(p, {}, [{}, {}, { gross_amount: '800.00' }]),
    invoices: [
      ...editBody(p, {}, [{}, {}, { gross_amount: '800.00' }]).invoices,
      invoice('4', '100.00', { pdc_group: 'new-b' }),
      invoice('5', '200.25', { pdc_group: 'new-b' }),
    ],
    pdc_groups: [...editBody(p).pdc_groups, { key: 'new-b', pdc_no: 'SHARED-2', pdc_date: null }],
  });
  check('adding a second shared check returns 200', grow.status === 200, grow.body);
  p = await get(id);
  check(
    'two shared checks with derived amounts',
    same(pdcShape(p).groups, [
      { pdc_no: 'SHARED-1', pdc_date: '2026-12-20', amount: '1050.50', invoices: ['2', '3'] },
      { pdc_no: 'SHARED-2', pdc_date: null, amount: '300.25', invoices: ['4', '5'] },
    ]),
    pdcShape(p).groups,
  );

  // 6. Status PATCH edits a shared check's number; invoices it omits keep their coverage.
  const first = p.pdc_groups[0];
  const patch = await call('PATCH', `/payables/${id}/status`, {
    status_id: p.status_id,
    pdc_groups: [{ key: first.key, pdc_no: 'SHARED-1B', pdc_date: '2026-12-21' }],
  });
  check('status PATCH with pdc_groups returns 200', patch.status === 200, patch.body);
  p = await get(id);
  check(
    'PATCH renamed shared check 1 and kept everything else',
    same(pdcShape(p).groups.map((g) => [g.pdc_no, g.pdc_date, g.invoices]), [
      ['SHARED-1B', '2026-12-21', ['2', '3']],
      ['SHARED-2', null, ['4', '5']],
    ]) && same(pdcShape(p).invoices[0].own, expected.invoices[0].own),
    pdcShape(p),
  );

  // 7. Invoice 2 takes its own schedule; shared check 1 is left with invoice 3 alone, so it becomes 3's own check.
  const leave = await call('PUT', `/payables/${id}`, editBody(p, {}, [{}, { pdc_group: null, pdc_lines: [{ pdc_no: 'OWN-3', amount: '250.50' }] }]));
  check('invoice 2 leaving the shared check returns 200', leave.status === 200, leave.body);
  p = await get(id);
  const shape = pdcShape(p);
  check(
    'a one-invoice shared check is stored as that invoice\'s own check for its net',
    same(shape.invoices[1].own, [['OWN-3', null, '250.50']]) &&
      same(shape.invoices[2], { no: '3', own: [['SHARED-1B', '2026-12-21', '800.00']], shared: null }) &&
      same(shape.groups.map((g) => g.invoices), [['4', '5']]),
    shape,
  );

  // 8. Switching to a non-PDC method drops every PDC row.
  const toCheck = await call('PUT', `/payables/${id}`, editBody(p, { payment_method_id: checkMethod.id }));
  check('switch to Check returns 200', toCheck.status === 200, toCheck.body);
  p = await get(id);
  check(
    'non-PDC payable has no own lines and no shared checks',
    p.invoices.every((inv) => inv.pdc_lines.length === 0 && inv.pdc_group === null) && p.pdc_groups.length === 0 && p.pdc_count === 0,
    p,
  );
} finally {
  for (const payableId of created) await call('DELETE', `/payables/${payableId}`);
  console.log(`cleanup: deleted ${created.length} proof payable(s)`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
