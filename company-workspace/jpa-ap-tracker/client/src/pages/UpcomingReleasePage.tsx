import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { api, errorMessage, qs, type PayableStatus, type UpcomingRelease } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, StatusSelect } from '../components';
import { AttachmentPreview } from '../components/AttachmentPreview';
import { InvoiceLinesPanel } from '../components/InvoiceLinesPanel';
import { FuelDetailsRow, isFuelType } from '../components/FuelDetails';
import { allowedPayableStatusIdsForRow, StatusChangeModal } from '../components/StatusChangeModal';
import { useAssignees, useLedgerStatuses, useSourceAccounts } from '../hooks';
import { isReserveStatus, useLedger } from '../ledger';
import { addDays, formatDate, formatMoney, WEEKDAYS } from '../format';

type Item = UpcomingRelease['items'][number];

interface Overrides {
  releaseDate?: string;
  daysBefore?: number;
  daysAfter?: number;
  includeOverdue?: boolean;
  showPaid?: boolean;
  reference?: string;
}

const isOpen = (i: Item) => i.status_category === 'open';
const totalOf = (items: Item[]) => items.reduce((sum, i) => sum + Math.round(Number(i.amount) * 100), 0) / 100;

function timing(daysBeforeDue: number): string {
  if (daysBeforeDue === 0) return 'on the due date';
  const n = Math.abs(daysBeforeDue);
  const unit = n === 1 ? 'day' : 'days';
  return daysBeforeDue > 0 ? `${n} ${unit} before due` : `${n} ${unit} after due`;
}

export default function UpcomingReleasePage() {
  const ledger = useLedger();
  const auth = useAuth();
  const qc = useQueryClient();
  const [overrides, setOverrides] = useState<Overrides>({});
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [refs, setRefs] = useState<Record<number, string>>({});
  const [paidAt, setPaidAt] = useState('');
  const [bulkCheckDate, setBulkCheckDate] = useState('');
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [bulkStatusId, setBulkStatusId] = useState<number | ''>('');
  const [bulkSourceAccountId, setBulkSourceAccountId] = useState<string>('');
  const [bulkAssignedTo, setBulkAssignedTo] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fuelOpenId, setFuelOpenId] = useState<number | null>(null);
  const [preview, setPreview] = useState<Item | null>(null);
  const [statusChange, setStatusChange] = useState<{ payable: Item; next: PayableStatus } | null>(null);
  const [referenceDraft, setReferenceDraft] = useState('');
  const [refSortDir, setRefSortDir] = useState<'asc' | 'desc' | null>(null);
  const statuses = useLedgerStatuses(ledger.statusEndpoint);
  const bulkStatus = statuses.data?.find((s) => s.id === bulkStatusId);
  const canChangeStatus = auth.can(ledger.perms.status);
  const bulkNeedsSource = Boolean(bulkStatus && isReserveStatus(bulkStatus.name, ledger.reserveName));
  const bulkIsAnytime = Boolean(ledger.kind === 'payable' && bulkStatus && bulkStatus.sort_order === 0);
  const sourceAccounts = useSourceAccounts(false, canChangeStatus && bulkNeedsSource);
  const assignees = useAssignees();
  const bulkAnytimeAssignees = useMemo(() => {
    const all = assignees.data ?? [];
    if (!bulkStatus) return all;
    const bound = all.filter((u) => u.default_payable_status_ids?.includes(bulkStatus.id));
    return bound.length > 0 ? bound : all;
  }, [assignees.data, bulkStatus]);

  const upcoming = useQuery({
    queryKey: ['upcoming', ledger.kind, overrides],
    queryFn: () => api.get<UpcomingRelease>(`${ledger.windowBase}/upcoming${qs({ ...overrides })}`),
    placeholderData: keepPreviousData,
  });
  const data = upcoming.data;

  const groups = useMemo((): [string, Item[]][] => {
    const map = new Map<string, Item[]>();
    for (const item of data?.items ?? []) {
      const list = map.get(item.payment_method_name) ?? [];
      list.push(item);
      map.set(item.payment_method_name, list);
    }
    const entries = [...map.entries()];
    if (!refSortDir) return entries;
    const mul = refSortDir === 'asc' ? 1 : -1;
    return entries.map(([name, items]) => [
      name,
      [...items].sort((a, b) => {
        const ar = (a.payment_reference ?? '').toLowerCase();
        const br = (b.payment_reference ?? '').toLowerCase();
        if (!ar && br) return 1;
        if (ar && !br) return -1;
        return ar.localeCompare(br) * mul;
      }),
    ]);
  }, [data, refSortDir]);

  const subtotal = (name: string) => data?.totals.byMethod.find((m) => m.name === name);
  const selectedItems = (data?.items ?? []).filter((i) => selected[i.id]);
  const selectedTotal = totalOf(selectedItems);
  /** Bulk targets: intersection of each selected row's next workflow step (+ cancel). */
  const bulkAllowedIds = useMemo((): number[] | null => {
    if (ledger.kind !== 'payable' || selectedItems.length === 0) return null;
    const [first, ...rest] = selectedItems;
    let common = allowedPayableStatusIdsForRow(
      statuses.data,
      first!,
      auth.user?.payable_status_ids,
      auth.isAdmin,
    );
    for (const item of rest) {
      const next = new Set(
        allowedPayableStatusIdsForRow(
          statuses.data,
          item,
          auth.user?.payable_status_ids,
          auth.isAdmin,
        ),
      );
      common = common.filter((id) => next.has(id));
    }
    return common;
  }, [ledger.kind, selectedItems, statuses.data]);

  const update = (patch: Overrides) => {
    setOverrides((o) => ({ ...o, ...patch }));
    setSelected({});
    setExpandedId(null);
    setMessage(null);
  };

  const applyReferenceFilter = (value: string) => {
    const trimmed = value.trim();
    setReferenceDraft(trimmed);
    update({ reference: trimmed || undefined });
  };

  const shiftRelease = (days: number) => data && update({ releaseDate: addDays(data.releaseDate, days) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['upcoming', ledger.kind] });
    qc.invalidateQueries({ queryKey: ['ledger', ledger.kind] });
    qc.invalidateQueries({ queryKey: ['source-accounts'] });
    qc.invalidateQueries({ queryKey: ['source-transactions'] });
  };

  const setStatus = useMutation({
    mutationFn: ({
      items,
      status,
      remarks,
      source_account_id,
      paid_at,
      check_date,
      assigned_to,
    }: {
      items: Item[];
      status: PayableStatus;
      remarks?: string | null;
      source_account_id?: number | null;
      paid_at?: string | null;
      check_date?: string | null;
      assigned_to?: number | null;
    }) =>
      api.post<{ count: number; status: string; paid_at: string | null }>(`${ledger.windowBase}/set-status`, {
        status_id: status.id,
        paid_at: (paid_at ?? paidAt) || null,
        check_date: check_date ?? null,
        remarks: remarks || null,
        ...(source_account_id != null ? { source_account_id } : {}),
        ...(assigned_to !== undefined ? { assigned_to } : {}),
        items: items.map((i) => ({
          id: i.id,
          payment_reference: refs[i.id]?.trim() || i.payment_reference || null,
        })),
      }),
    onSuccess: (res, { items }) => {
      setMessage(
        items.length === 1
          ? `#${items[0].id} ${items[0].client_name} set to ${res.status}.`
          : `${res.count} ${ledger.doc}(s) set to ${res.status}${res.paid_at ? ` (${ledger.doneWord} ${formatDate(res.paid_at)})` : ''}.`,
      );
      setSelected((s) => ({ ...s, ...Object.fromEntries(items.map((i) => [i.id, false])) }));
      setBulkRemarks('');
      setBulkCheckDate('');
      setBulkSourceAccountId('');
      setBulkAssignedTo('');
      refresh();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const patchStatus = useMutation({
    mutationFn: (payload: {
      id: number;
      statusId: number;
      remarks?: string | null;
      payment_reference?: string | null;
      paid_at?: string | null;
      check_date?: string | null;
      source_account_id?: number | null;
      assigned_to?: number | null;
      custom_field_values?: Record<string, string>;
    }) =>
      api.patch(`${ledger.apiBase}/${payload.id}/status`, {
        status_id: payload.statusId,
        remarks: payload.remarks,
        payment_reference: payload.payment_reference,
        paid_at: payload.paid_at,
        check_date: payload.check_date,
        ...(payload.source_account_id !== undefined ? { source_account_id: payload.source_account_id } : {}),
        ...(payload.assigned_to !== undefined ? { assigned_to: payload.assigned_to } : {}),
        ...(payload.custom_field_values && Object.keys(payload.custom_field_values).length
          ? { custom_field_values: payload.custom_field_values }
          : {}),
      }),
    onSuccess: (_res, vars) => {
      setMessage(`#${vars.id} set to status updated.`);
      setStatusChange(null);
      refresh();
      qc.invalidateQueries({ queryKey: ['payable-status-history'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const applyStatus = (
    items: Item[],
    status: PayableStatus,
    confirm: boolean,
    remarksFromBar?: string,
    sourceFromBar?: string,
    assignedFromBar?: string,
  ) => {
    setError(null);
    setMessage(null);
    if (status.category === 'paid') {
      const missing = items.filter((i) => i.requires_reference && !(refs[i.id]?.trim() || i.payment_reference));
      if (missing.length) {
        setError(`Enter a reference (check no. / transaction ref) for: ${missing.map((i) => `#${i.id} ${i.client_name}`).join(', ')}`);
        return;
      }
      if (!bulkCheckDate) {
        setError('Check date is required when marking as paid.');
        return;
      }
    }
    const needsSource = isReserveStatus(status.name, ledger.reserveName);
    const sourceId = sourceFromBar || bulkSourceAccountId;
    if (needsSource && !sourceId) {
      setError(ledger.reserveBulkMissing);
      return;
    }
    const anytime = ledger.kind === 'payable' && status.sort_order === 0;
    const assignedRaw = assignedFromBar ?? bulkAssignedTo;
    if (anytime && !assignedRaw) {
      setError(`Choose who to assign when moving to “${status.name}”.`);
      return;
    }
    let remarks = remarksFromBar?.trim() || '';
    if (status.category === 'cancelled') {
      if (!remarks) {
        const prompted = window.prompt('Remarks are required when cancelling. Enter a reason:', '');
        if (prompted === null) return;
        remarks = prompted.trim();
      }
      if (!remarks) {
        setError('Remarks are required when cancelling.');
        return;
      }
    }
    if (!confirm || window.confirm(`Set ${items.length} ${ledger.doc}(s) totalling ${formatMoney(totalOf(items))} to "${status.name}"?`)) {
      setStatus.mutate({
        items,
        status,
        remarks: remarks || null,
        source_account_id: needsSource ? Number(sourceId) : undefined,
        paid_at: paidAt || null,
        check_date: status.category === 'paid' ? bulkCheckDate : null,
        assigned_to: anytime ? Number(assignedRaw) : undefined,
      });
    }
  };

  const toggleGroup = (items: Item[], value: boolean) =>
    setSelected((s) => ({ ...s, ...Object.fromEntries(items.map((i) => [i.id, value])) }));

  const busy = setStatus.isPending || patchStatus.isPending;

  const exportExcel = () => {
    const rows = (data?.items ?? []).map((item) => ({
      Payee: item.client_name,
      'Check no': item.payment_reference ?? '',
      'Check date': item.check_date ?? '',
      Amount: Number(item.amount),
      'Source account': [item.source_account_bank_name, item.source_account_number].filter(Boolean).join(' · '),
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Upcoming Release');
    XLSX.writeFile(book, `upcoming-release-${data?.releaseDate ?? 'export'}.xlsx`);
  };

  return (
    <section>
      <div className="page-header">
        <h1>{ledger.windowTitle}</h1>
        <div className="page-header-actions no-print">
          <button type="button" className="btn" onClick={exportExcel} disabled={!data?.items.length}>
            Export Excel
          </button>
        </div>
      </div>

      <div className="card filters no-print">
        <label>
          {ledger.dateColumn}
          <div className="row date-nav">
            <button type="button" className="btn small" onClick={() => shiftRelease(-7)} title="Previous week">
              ◀
            </button>
            <input
              type="date"
              value={overrides.releaseDate ?? data?.releaseDate ?? ''}
              onChange={(e) => update({ releaseDate: e.target.value || undefined })}
            />
            <button type="button" className="btn small" onClick={() => shiftRelease(7)} title="Next week">
              ▶
            </button>
          </div>
        </label>
        <label>
          Days before
          <input
            type="number"
            min={0}
            max={365}
            value={overrides.daysBefore ?? data?.daysBefore ?? ''}
            onChange={(e) => update({ daysBefore: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>
        <label>
          Days after
          <input
            type="number"
            min={0}
            max={365}
            value={overrides.daysAfter ?? data?.daysAfter ?? ''}
            onChange={(e) => update({ daysAfter: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={overrides.includeOverdue ?? data?.includeOverdue ?? true}
            onChange={(e) => update({ includeOverdue: e.target.checked })}
          />
          Include carried-over (due before window)
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={overrides.showPaid ?? data?.showPaid ?? true}
            onChange={(e) => update({ showPaid: e.target.checked })}
          />
          {ledger.showDone}
        </label>
        <label>
          Reference no.
          <input
            type="search"
            inputMode="numeric"
            placeholder="Payment reference"
            value={referenceDraft}
            onChange={(e) => setReferenceDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyReferenceFilter(referenceDraft)}
            onBlur={() => {
              if (referenceDraft.trim() !== (overrides.reference ?? '')) applyReferenceFilter(referenceDraft);
            }}
          />
        </label>
        <div className="row presets">
          <button className="btn small" onClick={() => update({ daysBefore: 7 })}>
            1 week
          </button>
          <button className="btn small" onClick={() => update({ daysBefore: 14 })}>
            2 weeks
          </button>
          <button
            className="btn small ghost"
            onClick={() => {
              setReferenceDraft('');
              setOverrides({});
              setSelected({});
              setExpandedId(null);
              setMessage(null);
            }}
          >
            Reset to defaults
          </button>
        </div>
      </div>

      {data && (
        <div className="release-banner">
          <div>
            <div className="muted small">{ledger.dateColumn.replace(' date', '')} on</div>
            <div className="big">{formatDate(data.releaseDate)}</div>
            <div className="muted small">
              Covers deadlines {data.includeOverdue ? 'up to' : `${formatDate(data.windowStart)} to`} {formatDate(data.windowEnd)}
            </div>
            <div className="muted small">
              {ledger.scheduleDayLabel} {WEEKDAYS[data.releaseWeekday]} ·{' '}
              <Link to="/settings" className="no-print">
                change defaults
              </Link>
            </div>
          </div>
          <div>
            <div className="muted small">{ledger.stillLabel}</div>
            <div className="big">{formatMoney(data.totals.overall.amount)}</div>
            <div className="muted small">
              {data.totals.overall.count} item(s)
              {Number(data.totals.overall.carried_over_amount) > 0 &&
                ` · ${formatMoney(data.totals.overall.carried_over_amount)} carried over`}
            </div>
          </div>
          <div>
            <div className="muted small">{ledger.alreadyLabel}</div>
            <div className="big">{formatMoney(data.totals.overall.paid_amount)}</div>
            <div className="muted small">
              {data.totals.overall.paid_count} item(s){!data.showPaid && ' · hidden'}
            </div>
          </div>
        </div>
      )}

      <ErrorBox error={upcoming.error ? errorMessage(upcoming.error) : error} />
      {message && <div className="alert success">{message}</div>}

      {data && data.items.length === 0 && <div className="card muted">Nothing {ledger.toVerb} for this window.</div>}

      {groups.map(([methodName, items]) => {
        const sub = subtotal(methodName);
        const allChecked = items.every((i) => selected[i.id]);
        return (
          <div key={methodName} className="card group">
            <div className="group-header">
              <label className="checkbox no-print">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => toggleGroup(items, e.target.checked)}
                />
              </label>
              <h2>{methodName}</h2>
              <span className="muted">
                {sub?.count ?? 0} {ledger.toVerb}{sub?.paid_count ? ` · ${sub.paid_count} ${ledger.doneWord} (${formatMoney(sub.paid_amount)})` : ''}
              </span>
              <span className="group-total">{formatMoney(sub?.amount ?? 0)}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="no-print"></th>
                    <th>{ledger.party}</th>
                    <th>Due</th>
                    <th>{ledger.dateColumn}</th>
                    <th className="num">Amount</th>
                    <th>Status</th>
                    <th
                      className="sortable"
                      onClick={() =>
                        setRefSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'))
                      }
                    >
                      Reference{refSortDir === 'asc' ? ' ▲' : refSortDir === 'desc' ? ' ▼' : ''}
                    </th>
                    <th>Source</th>
                    <th>Invoice</th>
                    <th>Type</th>
                    <th className="no-print">Files</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const open = isOpen(i);
                    const multi = (i.invoice_count ?? 0) > 1;
                    const expanded = expandedId === i.id;
                    const fuelOpen = fuelOpenId === i.id;
                    return (
                      <Fragment key={i.id}>
                      <tr className={`${!open ? 'paid' : i.past_due ? 'overdue' : ''} ${expanded ? 'expanded' : ''}`}>
                        <td className="no-print">
                          <input
                            type="checkbox"
                            checked={Boolean(selected[i.id])}
                            onChange={(e) => setSelected((s) => ({ ...s, [i.id]: e.target.checked }))}
                          />
                        </td>
                        <td>
                          <Link to={`${ledger.listPath}/${i.id}`}>{i.client_name}</Link>
                          {i.description && <div className="muted small">{i.description}</div>}
                        </td>
                        <td>
                          <strong>{formatDate(i.due_date)}</strong>
                          {i.invoice_date && i.payment_term_name && (
                            <div className="muted small">
                              Invoice {formatDate(i.invoice_date)} + {i.payment_term_name}
                            </div>
                          )}
                          {open && i.carried_over && <div className="tag-overdue">carried over</div>}
                          {open && !i.carried_over && i.past_due && <div className="tag-overdue">past due</div>}
                        </td>
                        <td>
                          <strong>{formatDate(i.release_date)}</strong>
                          <div className={i.days_before_due < 0 ? 'tag-overdue' : 'muted small'}>
                            {!open && `${ledger.doneWord} · `}
                            {timing(i.days_before_due)}
                          </div>
                        </td>
                        <td className="num">{formatMoney(i.amount)}</td>
                        <td>
                          <span className="print-only">{i.status_name}</span>
                          <span className="no-print">
                            {canChangeStatus ? (
                              <StatusSelect
                                statuses={statuses.data}
                                value={i.status_id}
                                allowedIds={
                                  ledger.kind === 'payable'
                                    ? allowedPayableStatusIdsForRow(
                                        statuses.data,
                                        i,
                                        auth.user?.payable_status_ids,
                                        auth.isAdmin,
                                      )
                                    : null
                                }
                                disabled={
                                  busy || (!auth.isAdmin && i.assigned_to !== auth.user?.id)
                                }
                                onChange={(next) => {
                                  if (next.id === i.status_id) return;
                                  setStatusChange({ payable: i, next });
                                }}
                              />
                            ) : (
                              <span style={{ color: i.status_color }}>{i.status_name}</span>
                            )}
                          </span>
                          {i.status_category === 'paid' && <div className="muted small">{formatDate(i.paid_at)}</div>}
                        </td>
                        <td>
                          {open ? (
                            <input
                              className="ref-input"
                              placeholder={i.requires_reference ? 'Required' : 'Optional'}
                              value={refs[i.id] ?? i.payment_reference ?? ''}
                              onChange={(e) => setRefs((r) => ({ ...r, [i.id]: e.target.value }))}
                            />
                          ) : (
                            i.payment_reference ?? <span className="muted">-</span>
                          )}
                        </td>
                        <td>
                          {i.source_account_bank_name ? (
                            <>
                              {i.source_account_bank_name}
                              {i.source_account_number && <div className="muted small">{i.source_account_number}</div>}
                            </>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td>
                          {multi ? (
                            <button
                              type="button"
                              className="accordion-toggle no-print"
                              onClick={() => setExpandedId((id) => (id === i.id ? null : i.id))}
                              aria-expanded={expanded}
                            >
                              <span className={`chevron ${expanded ? 'open' : ''}`} aria-hidden>
                                ▶
                              </span>
                              <span>
                                {i.invoice_count} invoices
                                {i.invoice_no && <span className="muted"> · {i.invoice_no}</span>}
                              </span>
                            </button>
                          ) : (
                            i.invoice_no ?? <span className="muted">-</span>
                          )}
                          {multi && <span className="print-only">{i.invoice_no}</span>}
                        </td>
                        <td>
                          {ledger.fuel && isFuelType(i.payment_type_name) ? (
                            <>
                              <button
                                type="button"
                                className="accordion-toggle no-print"
                                onClick={() => setFuelOpenId((id) => (id === i.id ? null : i.id))}
                                aria-expanded={fuelOpen}
                              >
                                <span className={`chevron ${fuelOpen ? 'open' : ''}`} aria-hidden>
                                  ▶
                                </span>
                                <span>{i.payment_type_name}</span>
                              </button>
                              <span className="print-only">{i.payment_type_name}</span>
                            </>
                          ) : (
                            i.payment_type_name
                          )}
                        </td>
                        <td className="no-print">
                          {i.attachment_count > 0 ? (
                            <button type="button" className="btn ghost small" onClick={() => setPreview(i)}>
                              View {i.attachment_count} file{i.attachment_count === 1 ? '' : 's'}
                            </button>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                      </tr>
                      {ledger.fuel && fuelOpen && <FuelDetailsRow payable={i} colSpan={11} />}
                      {expanded && <InvoiceLinesPanel payableId={i.id} colSpan={11} />}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {data && data.totals.byClient.length > 0 && (
        <div className="card">
          <h2>{ledger.byParty}</h2>
          <table>
            <thead>
              <tr>
                <th>{ledger.party}</th>
                <th className="num">{ledger.openColumn}</th>
                <th className="num">{ledger.doneColumn}</th>
              </tr>
            </thead>
            <tbody>
              {data.totals.byClient.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="num">
                    {formatMoney(c.amount)} <span className="muted small">({c.count})</span>
                  </td>
                  <td className="num">
                    {formatMoney(c.paid_amount)} <span className="muted small">({c.paid_count})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canChangeStatus && selectedItems.length > 0 && (
        <div className="release-bar no-print">
          <span className="release-bar-summary">
            <strong>{selectedItems.length}</strong> selected · <strong>{formatMoney(selectedTotal)}</strong>
          </span>
          <div className="release-bar-controls">
            <label className="row">
              Set status to
              <StatusSelect
                statuses={statuses.data}
                value={bulkStatusId}
                allowedIds={bulkAllowedIds}
                placeholder="Choose status..."
                onChange={(s) => setBulkStatusId(s.id)}
              />
            </label>
            {bulkStatus?.category === 'paid' && (
              <>
                <label className="row">
                  {ledger.paidOnLabel}
                  <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
                </label>
                <label className="row">
                  Check date *
                  <input
                    type="date"
                    value={bulkCheckDate}
                    required
                    onChange={(e) => setBulkCheckDate(e.target.value)}
                  />
                </label>
              </>
            )}
            {bulkNeedsSource && (
              <label className="row">
                Source account *
                <select
                  className="source-account-select"
                  value={bulkSourceAccountId}
                  onChange={(e) => setBulkSourceAccountId(e.target.value)}
                  required
                >
                  <option value="">Select account...</option>
                  {sourceAccounts.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bank_name} · {a.account_number}
                      {a.available_balance != null ? ` (${formatMoney(a.available_balance)})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {bulkIsAnytime && (
              <label className="row">
                Assign to *
                <select
                  value={bulkAssignedTo}
                  onChange={(e) => setBulkAssignedTo(e.target.value)}
                  required
                >
                  <option value="">Select user...</option>
                  {bulkAnytimeAssignees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {bulkStatus && (
              <label className="row">
                Remarks {bulkStatus.category === 'cancelled' ? '*' : ''}
                <input
                  value={bulkRemarks}
                  placeholder={bulkStatus.category === 'cancelled' ? 'Required for cancel' : 'Optional'}
                  onChange={(e) => setBulkRemarks(e.target.value)}
                />
              </label>
            )}
            <button
              type="button"
              className="btn primary"
              onClick={() =>
                bulkStatus &&
                applyStatus(
                  selectedItems,
                  bulkStatus,
                  true,
                  bulkRemarks,
                  bulkSourceAccountId,
                  bulkAssignedTo,
                )
              }
              disabled={
                busy ||
                !bulkStatus ||
                (bulkNeedsSource && !bulkSourceAccountId) ||
                (bulkIsAnytime && !bulkAssignedTo) ||
                (bulkStatus.category === 'paid' && !bulkCheckDate)
              }
            >
              {busy ? 'Saving...' : 'Apply'}
            </button>
          </div>
        </div>
      )}

      {preview && <AttachmentPreview payable={preview} onClose={() => setPreview(null)} />}

      {statusChange && (
        <StatusChangeModal
          payable={statusChange.payable}
          nextStatus={statusChange.next}
          pending={patchStatus.isPending}
          submitError={error}
          onClose={() => {
            setStatusChange(null);
            setError(null);
          }}
          onConfirm={({
            remarks,
            payment_reference,
            paid_at,
            check_date,
            source_account_id,
            assigned_to,
            custom_field_values,
          }) => {
            setError(null);
            if (payment_reference) {
              setRefs((r) => ({ ...r, [statusChange.payable.id]: payment_reference }));
            }
            if (paid_at) setPaidAt(paid_at);
            patchStatus.mutate({
              id: statusChange.payable.id,
              statusId: statusChange.next.id,
              remarks: remarks || null,
              payment_reference,
              paid_at,
              check_date,
              source_account_id,
              assigned_to,
              custom_field_values,
            });
          }}
        />
      )}
    </section>
  );
}
