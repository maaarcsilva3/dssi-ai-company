import { Fragment, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  errorMessage,
  qs,
  type Payable,
  type PayableList,
  type PayableStatus,
  type StatusCategory,
} from '../api';
import { useAuth } from '../auth';
import { useLedgerStatuses, useParties, usePaymentMethods, usePaymentTypes, useSettings } from '../hooks';
import { useLedger } from '../ledger';
import { ConfirmDialog, ErrorBox, Modal, StatusSelect, type ConfirmRequest } from '../components';
import { AttachmentPreview } from '../components/AttachmentPreview';
import { InvoiceLinesPanel } from '../components/InvoiceLinesPanel';
import { FuelDetailsRow, isFuelType } from '../components/FuelDetails';
import { allowedPayableStatusIdsForRow, StatusChangeModal } from '../components/StatusChangeModal';
import { canViewStatusHistory, StatusHistoryPanel } from '../components/StatusHistoryPanel';
import { formatDate, formatMoney } from '../format';
import type { PdcStatusPayload } from '../lib/pdc';

const PAGE_SIZE = 50;

/** Status filter values: 'all', 'cat:<category>' or 'id:<statusId>'. */
function statusFilterQuery(value: string): { category?: string; statusId?: string } {
  if (value.startsWith('cat:')) return { category: value.slice(4) };
  if (value.startsWith('id:')) return { statusId: value.slice(3) };
  return {};
}

/** Drafts: creator (or assignee). Submitted: assignee only. Admins: all. */
function canEditLedgerDoc(
  isAdmin: boolean,
  userId: number | undefined,
  p: Pick<Payable, 'is_draft' | 'created_by' | 'assigned_to'>,
) {
  if (isAdmin) return true;
  if (userId == null) return false;
  if (p.is_draft) return p.created_by === userId || p.assigned_to === userId;
  return p.assigned_to === userId;
}

export default function PayablesPage() {
  const ledger = useLedger();
  const auth = useAuth();
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<Payable | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fuelOpenId, setFuelOpenId] = useState<number | null>(null);

  const [statusChange, setStatusChange] = useState<{ payable: Payable; next: PayableStatus } | null>(null);
  const [historyPayable, setHistoryPayable] = useState<Payable | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(
    () =>
      Boolean(
        sp.get('dueFrom') ||
          sp.get('dueTo') ||
          sp.get('reference') ||
          sp.get('includeDrafts') === 'true' ||
          sp.get('draftsOnly') === 'true',
      ),
  );

  const filters = {
    status: sp.get('status') ?? 'cat:open',
    clientId: sp.get('clientId') ?? '',
    typeId: sp.get('typeId') ?? '',
    methodId: sp.get('methodId') ?? '',
    dueFrom: sp.get('dueFrom') ?? '',
    dueTo: sp.get('dueTo') ?? '',
    search: sp.get('search') ?? '',
    reference: sp.get('reference') ?? '',
    includeDrafts: sp.get('includeDrafts') === 'true',
    draftsOnly: sp.get('draftsOnly') === 'true',
    sort: sp.get('sort') ?? 'due_date',
    dir: sp.get('dir') ?? 'asc',
    page: Number(sp.get('page') ?? 1),
  };

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSp(next, { replace: true });
  };

  const toggleSort = (col: string) => {
    const next = new URLSearchParams(sp);
    next.set('dir', filters.sort === col && filters.dir === 'asc' ? 'desc' : 'asc');
    next.set('sort', col);
    setSp(next, { replace: true });
  };

  const setDraftFilters = (includeDrafts: boolean, draftsOnly: boolean) => {
    const next = new URLSearchParams(sp);
    if (includeDrafts) next.set('includeDrafts', 'true');
    else next.delete('includeDrafts');
    if (draftsOnly) next.set('draftsOnly', 'true');
    else next.delete('draftsOnly');
    next.delete('page');
    setSp(next, { replace: true });
  };

  const clients = useParties(ledger.partyEndpoint, true);
  const types = usePaymentTypes(true);
  const methods = usePaymentMethods(true);
  const statuses = useLedgerStatuses(ledger.statusEndpoint);
  const settings = useSettings();
  const today = settings.data?.today ?? '';

  const list = useQuery({
    queryKey: ['ledger', ledger.kind, 'list', filters],
    queryFn: () => {
      const { status, ...rest } = filters;
      return api.get<PayableList>(`${ledger.apiBase}${qs({ ...rest, ...statusFilterQuery(status), pageSize: PAGE_SIZE })}`);
    },
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['ledger', ledger.kind] });
    qc.invalidateQueries({ queryKey: ['upcoming', ledger.kind] });
  };

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`${ledger.apiBase}/${id}`),
    onSuccess: () => {
      setConfirm(null);
      invalidate();
    },
    onError: (e) => setActionError(errorMessage(e)),
  });

  const changeStatus = useMutation({
    mutationFn: ({
      id,
      statusId,
      reference,
      remarks,
      paid_at,
      check_date,
      source_account_id,
      assigned_to,
      custom_field_values,
      pdc,
    }: {
      id: number;
      statusId: number;
      reference?: string | null;
      remarks?: string | null;
      paid_at?: string | null;
      check_date?: string | null;
      source_account_id?: number | null;
      assigned_to?: number | null;
      custom_field_values?: Record<string, string>;
      pdc?: PdcStatusPayload;
    }) =>
      api.patch(`${ledger.apiBase}/${id}/status`, {
        status_id: statusId,
        payment_reference: reference,
        remarks,
        paid_at,
        check_date,
        ...(source_account_id !== undefined ? { source_account_id } : {}),
        ...(assigned_to !== undefined ? { assigned_to } : {}),
        ...(custom_field_values && Object.keys(custom_field_values).length
          ? { custom_field_values }
          : {}),
        ...pdc,
      }),
    onSuccess: () => {
      setStatusChange(null);
      invalidate();
      qc.invalidateQueries({ queryKey: ['payable-status-history'] });
      qc.invalidateQueries({ queryKey: ['source-accounts'] });
      qc.invalidateQueries({ queryKey: ['source-transactions'] });
    },
    onError: (e) => setActionError(errorMessage(e)),
  });

  const onStatusChange = (p: Payable, next: PayableStatus) => {
    setActionError(null);
    if (next.id === p.status_id) return;
    setStatusChange({ payable: p, next });
  };

  const onDelete = (p: Payable) => {
    setActionError(null);
    setConfirm({
      title: `Delete ${ledger.doc}`,
      message: `Delete ${ledger.doc} #${p.id} for ${p.client_name} (${formatMoney(p.amount)})? This cannot be undone.`,
      onConfirm: () => remove.mutate(p.id),
    });
  };

  const data = list.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const sortMark = (col: string) => (filters.sort === col ? (filters.dir === 'asc' ? ' ▲' : ' ▼') : '');
  const customFieldColumns =
    ledger.kind === 'payable'
      ? (statuses.data ?? []).flatMap((s) =>
          s.active
            ? (s.custom_fields ?? [])
                .filter((f) => f.show_in_list && f.label.trim())
                .map((f) => ({ ...f, statusName: s.name }))
            : [],
        )
      : [];
  const baseColSpan = (auth.isAdmin ? 12 : 11) + customFieldColumns.length;

  return (
    <section>
      <div className="page-header">
        <h1>{ledger.title}</h1>
        {auth.can(ledger.perms.create) && (
          <div className="page-header-actions">
            <Link to={`${ledger.listPath}/new`} className="btn primary">
              {ledger.newLabel}
            </Link>
          </div>
        )}
      </div>

      <div className="filters card">
        <label className="filter-compact">
          Status
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="all">All</option>
            <optgroup label="By category">
              {(Object.keys(ledger.categoryLabels) as StatusCategory[]).map((c) => (
                <option key={c} value={`cat:${c}`}>
                  {ledger.categoryLabels[c]}
                </option>
              ))}
            </optgroup>
            <optgroup label="By status">
              {statuses.data?.map((s) => (
                <option key={s.id} value={`id:${s.id}`}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="filter-party">
          {ledger.party}
          <select value={filters.clientId} onChange={(e) => setFilter('clientId', e.target.value)}>
            <option value="">All</option>
            {clients.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-compact">
          Type
          <select value={filters.typeId} onChange={(e) => setFilter('typeId', e.target.value)}>
            <option value="">All</option>
            {types.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-compact">
          Method
          <select value={filters.methodId} onChange={(e) => setFilter('methodId', e.target.value)}>
            <option value="">All</option>
            {methods.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          Search
          <input
            type="search"
            placeholder={ledger.searchPlaceholder}
            defaultValue={filters.search}
            onKeyDown={(e) => e.key === 'Enter' && setFilter('search', (e.target as HTMLInputElement).value)}
            onBlur={(e) => e.target.value !== filters.search && setFilter('search', e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => setShowMoreFilters((v) => !v)}
        >
          {showMoreFilters ? 'Fewer filters' : 'More filters'}
        </button>
        {showMoreFilters && (
          <>
            <label className="filter-date">
              Due from
              <input type="date" value={filters.dueFrom} onChange={(e) => setFilter('dueFrom', e.target.value)} />
            </label>
            <label className="filter-date">
              Due to
              <input type="date" value={filters.dueTo} onChange={(e) => setFilter('dueTo', e.target.value)} />
            </label>
            <label className="filter-compact">
              Reference no.
              <input
                type="search"
                inputMode="numeric"
                placeholder="Payment reference"
                defaultValue={filters.reference}
                onKeyDown={(e) => e.key === 'Enter' && setFilter('reference', (e.target as HTMLInputElement).value)}
                onBlur={(e) => e.target.value !== filters.reference && setFilter('reference', e.target.value)}
              />
            </label>
            {ledger.kind === 'payable' && (
              <>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={filters.includeDrafts || filters.draftsOnly}
                    onChange={(e) => setDraftFilters(e.target.checked, false)}
                  />
                  Include drafts
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={filters.draftsOnly}
                    onChange={(e) => setDraftFilters(e.target.checked || filters.includeDrafts, e.target.checked)}
                  />
                  Drafts only
                </label>
              </>
            )}
          </>
        )}
      </div>

      <ErrorBox error={list.error ? errorMessage(list.error) : actionError} />

      <div className="summary">
        <span>
          <strong>{data?.total ?? 0}</strong> {ledger.docs}
        </span>
        <span>
          Total: <strong>{formatMoney(data?.totalAmount ?? 0)}</strong>
        </span>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('client')}>
                {ledger.party}{sortMark('client')}
              </th>
              <th>Invoice</th>
              <th className="sortable" onClick={() => toggleSort('due_date')}>
                Due{sortMark('due_date')}
              </th>
              <th className="num sortable" onClick={() => toggleSort('amount')}>
                Amount{sortMark('amount')}
              </th>
              <th>Status</th>
              {customFieldColumns.map((f) => (
                <th key={`cf-${f.id}`} title={f.statusName}>
                  {f.label}
                </th>
              ))}
              <th>Method</th>
              <th className="sortable" onClick={() => toggleSort('payment_reference')}>
                Reference{sortMark('payment_reference')}
              </th>
              <th>Source</th>
              {auth.isAdmin && <th>Assigned</th>}
              <th>Type</th>
              <th>Files</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && (
              <tr>
                <td colSpan={baseColSpan}>Loading...</td>
              </tr>
            )}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={baseColSpan} className="muted">
                  {ledger.emptyList}
                </td>
              </tr>
            )}
            {data?.items.map((p) => {
              const open = p.status_category === 'open';
              const overdue = open && today && p.due_date < today;
              const multi = (p.invoice_count ?? 0) > 1;
              const expanded = expandedId === p.id;
              const fuelOpen = fuelOpenId === p.id;
              const colSpan = baseColSpan;
              const rowAllowedIds =
                ledger.kind === 'payable'
                  ? allowedPayableStatusIdsForRow(
                      statuses.data,
                      p,
                      auth.user?.payable_status_ids,
                      auth.isAdmin,
                    )
                  : null;
              const canChangeStatus = auth.isAdmin || p.assigned_to === auth.user?.id;
              const hasStatusTargets = (rowAllowedIds?.length ?? 0) > 0;
              const toggleExpand = () => {
                if (!multi) return;
                setExpandedId((id) => (id === p.id ? null : p.id));
              };
              return (
                <Fragment key={p.id}>
                  <tr className={`${overdue ? 'overdue' : ''} ${multi ? 'expandable' : ''} ${expanded ? 'expanded' : ''}`}>
                    <td>
                      <Link to={`${ledger.listPath}/${p.id}`}>{p.client_name}</Link>
                      {p.is_draft && <div><span className="badge-draft">Draft</span></div>}
                      {p.description && <div className="muted small">{p.description}</div>}
                    </td>
                    <td>
                      {multi ? (
                        <button type="button" className="accordion-toggle" onClick={toggleExpand} aria-expanded={expanded}>
                          <span className={`chevron ${expanded ? 'open' : ''}`} aria-hidden>
                            ▶
                          </span>
                          <span>
                            {p.invoice_count} invoices
                            {p.invoice_no && <span className="muted"> · {p.invoice_no}</span>}
                          </span>
                        </button>
                      ) : (
                        <>
                          {p.invoice_no ?? <span className="muted">-</span>}
                          {p.invoice_date && <div className="muted small">{formatDate(p.invoice_date)}</div>}
                        </>
                      )}
                    </td>
                    <td>
                      {formatDate(p.due_date)}
                      {overdue && <div className="tag-overdue">overdue</div>}
                    </td>
                    <td className="num">
                      {formatMoney(p.amount)}
                      {p.apply_vat || p.apply_ewt || Number(p.gross_amount) !== Number(p.amount) ? (
                        <div className="muted small">gross {formatMoney(p.gross_amount)}</div>
                      ) : null}
                    </td>
                    <td>
                      {auth.can(ledger.perms.status) ? (
                        canChangeStatus && hasStatusTargets ? (
                          <StatusSelect
                            statuses={statuses.data}
                            value={p.status_id}
                            allowedIds={rowAllowedIds}
                            disabled={changeStatus.isPending}
                            onChange={(next) => onStatusChange(p, next)}
                          />
                        ) : (
                          <span
                            style={{ color: p.status_color }}
                            title={
                              canChangeStatus && !hasStatusTargets
                                ? 'You are not allowed to set this status'
                                : undefined
                            }
                          >
                            {p.status_name}
                          </span>
                        )
                      ) : (
                        <span style={{ color: p.status_color }}>{p.status_name}</span>
                      )}
                      {p.status_category === 'paid' && p.paid_at && (
                        <div className="muted small">{formatDate(p.paid_at)}</div>
                      )}
                    </td>
                    {customFieldColumns.map((f) => (
                      <td key={`cfv-${p.id}-${f.id}`}>
                        {p.status_field_values?.[String(f.id)] ?? <span className="muted">-</span>}
                      </td>
                    ))}
                    <td>
                      {p.payment_method_name}
                      {p.payment_term_name && <div className="muted small">{p.payment_term_name}</div>}
                    </td>
                    <td>
                      {p.payment_reference ?? <span className="muted">-</span>}
                      {(p.pdc_count ?? 0) > 1 && (
                        <div className="muted small">{p.pdc_count} PDCs</div>
                      )}
                    </td>
                    <td>
                      {p.source_account_bank_name ? (
                        <>
                          {p.source_account_bank_name}
                          {p.source_account_number && <div className="muted small">{p.source_account_number}</div>}
                        </>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    {auth.isAdmin && <td>{p.assigned_to_name ?? <span className="muted">-</span>}</td>}
                    <td>
                      {ledger.fuel && isFuelType(p.payment_type_name) ? (
                        <button
                          type="button"
                          className="accordion-toggle"
                          onClick={() => setFuelOpenId((id) => (id === p.id ? null : p.id))}
                          aria-expanded={fuelOpen}
                        >
                          <span className={`chevron ${fuelOpen ? 'open' : ''}`} aria-hidden>
                            ▶
                          </span>
                          <span>{p.payment_type_name}</span>
                        </button>
                      ) : (
                        p.payment_type_name
                      )}
                    </td>
                    <td>
                      {p.attachment_count > 0 ? (
                        <button type="button" className="btn ghost small" onClick={() => setPreview(p)}>
                          View {p.attachment_count} file{p.attachment_count === 1 ? '' : 's'}
                        </button>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td className="actions">
                      {canEditLedgerDoc(auth.isAdmin, auth.user?.id, p) && auth.can(ledger.perms.edit) ? (
                        <Link className="btn small" to={`${ledger.listPath}/${p.id}`}>
                          Edit
                        </Link>
                      ) : (
                        auth.can(ledger.perms.view) && (
                          <Link className="btn small" to={`${ledger.listPath}/${p.id}`}>
                            View
                          </Link>
                        )
                      )}
                      {canViewStatusHistory(auth, ledger.kind) && (
                        <button type="button" className="btn small" onClick={() => setHistoryPayable(p)}>
                          History
                        </button>
                      )}
                      {canEditLedgerDoc(auth.isAdmin, auth.user?.id, p) && auth.can(ledger.perms.delete) && (
                        <button className="btn small danger" onClick={() => onDelete(p)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                  {ledger.fuel && fuelOpen && <FuelDetailsRow payable={p} colSpan={colSpan} />}
                  {expanded && <InvoiceLinesPanel payableId={p.id} colSpan={colSpan} />}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pager">
          <button className="btn small" disabled={filters.page <= 1} onClick={() => setFilter('page', String(filters.page - 1))}>
            Prev
          </button>
          <span>
            Page {filters.page} of {totalPages}
          </span>
          <button
            className="btn small"
            disabled={filters.page >= totalPages}
            onClick={() => setFilter('page', String(filters.page + 1))}
          >
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        request={confirm}
        pending={remove.isPending}
        onClose={() => setConfirm(null)}
      />

      {preview && <AttachmentPreview payable={preview} onClose={() => setPreview(null)} />}

      {statusChange && (
        <StatusChangeModal
          payable={statusChange.payable}
          nextStatus={statusChange.next}
          pending={changeStatus.isPending}
          submitError={actionError}
          onClose={() => {
            setStatusChange(null);
            setActionError(null);
          }}
          onConfirm={({
            remarks,
            payment_reference,
            paid_at,
            check_date,
            source_account_id,
            assigned_to,
            custom_field_values,
            pdc,
          }) => {
            setActionError(null);
            changeStatus.mutate({
              id: statusChange.payable.id,
              statusId: statusChange.next.id,
              remarks,
              reference: payment_reference,
              paid_at,
              check_date,
              source_account_id,
              assigned_to,
              custom_field_values,
              pdc,
            });
          }}
        />
      )}

      {historyPayable && (
        <Modal
          title={`Status history · #${historyPayable.id}${
            historyPayable.invoice_no ? ` · ${historyPayable.invoice_no}` : ''
          }`}
          onClose={() => setHistoryPayable(null)}
        >
          <p className="muted">
            {historyPayable.client_name} · {formatMoney(historyPayable.amount)}
          </p>
          <StatusHistoryPanel documentId={historyPayable.id} defaultOpen />
        </Modal>
      )}
    </section>
  );
}

