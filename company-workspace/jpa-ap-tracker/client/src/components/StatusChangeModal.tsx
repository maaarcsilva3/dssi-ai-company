import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage, type Payable, type PayableStatus } from '../api';
import { useAuth } from '../auth';
import { formatMoney } from '../format';
import { ErrorBox, Modal } from '../components';
import { useAssignees, useSourceAccounts } from '../hooks';
import { isReserveStatus, useLedger } from '../ledger';
import { StatusHistoryPanel } from './StatusHistoryPanel';
import { WorkflowStepper } from './WorkflowStepper';
import { PdcSchedulePanel } from './PdcSchedulePanel';
import {
  invoicePdcPayload,
  isPdcPaymentMethodName,
  pdcLinesFromApi,
  pdcScheduleProblem,
  sharedPdcsFromApi,
  sharedPdcsPayload,
  type PdcLineDraft,
  type PdcStatusPayload,
  type SharedPdcDrafts,
} from '../lib/pdc';
import { useLedgerStatuses } from '../hooks';

/**
 * Allowed destinations mirror the server workflow:
 * - sort_order 0 = anytime (e.g. Reject) — always available
 * - same sort_order (> 0) = sibling choices
 * - previous / next distinct sort_order groups
 * - from sort_order 0: re-enter at the first positive sort_order group
 */
function nextStepStatusIds(statuses: PayableStatus[] | undefined, fromId: number): number[] {
  if (!statuses?.length) return [];
  const from = statuses.find((s) => s.id === fromId);
  if (!from) return [];

  const active = statuses
    .filter((s) => s.active)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

  const anytime = active.filter((s) => s.sort_order === 0 && s.id !== fromId).map((s) => s.id);
  const workflow = active.filter((s) => s.sort_order > 0);
  const orders = [...new Set(workflow.map((s) => s.sort_order))];
  const allowed = new Set<number>(anytime);

  const addGroup = (order: number | undefined) => {
    if (order == null) return;
    for (const s of workflow) {
      if (s.sort_order === order && s.id !== fromId) allowed.add(s.id);
    }
  };

  if (from.sort_order === 0) {
    addGroup(orders[0]);
    return [...allowed];
  }

  const idx = orders.indexOf(from.sort_order);
  addGroup(from.sort_order);
  if (idx >= 0) {
    addGroup(orders[idx - 1]);
    addGroup(orders[idx + 1]);
  }

  return [...allowed];
}

export function StatusChangeModal({
  payable,
  nextStatus,
  onConfirm,
  onClose,
  pending,
  submitError,
}: {
  payable: Payable;
  nextStatus: PayableStatus;
  onConfirm: (payload: {
    remarks: string;
    payment_reference: string | null;
    paid_at: string | null;
    check_date: string | null;
    source_account_id: number | null | undefined;
    assigned_to: number | null | undefined;
    custom_field_values: Record<string, string>;
    pdc?: PdcStatusPayload;
  }) => void;
  onClose: () => void;
  pending?: boolean;
  submitError?: string | null;
}) {
  const ledger = useLedger();
  const auth = useAuth();
  const needsRemarks = nextStatus.category === 'cancelled';
  const isPaid = nextStatus.category === 'paid';
  const needsSource = isReserveStatus(nextStatus.name, ledger.reserveName);
  const isPayable = ledger.kind === 'payable';
  const requireFile = Boolean(isPayable && nextStatus.require_file);
  const customFields = isPayable ? nextStatus.custom_fields ?? [] : [];
  const isAnytimeStatus = Boolean(isPayable && nextStatus.sort_order === 0);
  const canReassign =
    !isPayable &&
    (auth.isAdmin || (payable.assigned_to != null && payable.assigned_to === auth.user?.id));
  const [remarks, setRemarks] = useState('');
  const [reference, setReference] = useState(payable.payment_reference ?? '');
  const [paidAt, setPaidAt] = useState(payable.paid_at ?? '');
  const [checkDate, setCheckDate] = useState(payable.check_date ?? '');
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    payable.source_account_id ? String(payable.source_account_id) : '',
  );
  const [assignedTo, setAssignedTo] = useState(
    payable.assigned_to != null ? String(payable.assigned_to) : '',
  );
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workflowStatuses = useLedgerStatuses(ledger.statusEndpoint);
  const needsPdc =
    isPayable &&
    isPdcPaymentMethodName(payable.payment_method_name) &&
    (nextStatus.sort_order === 20 || nextStatus.sort_order === 30);
  const detail = useQuery({
    queryKey: ['ledger', ledger.kind, 'detail', payable.id],
    queryFn: () => api.get<Payable>(`${ledger.apiBase}/${payable.id}`),
    enabled: needsPdc,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  /** Edited PDC lines by invoice id; untouched invoices show their stored lines. */
  const [pdcEdits, setPdcEdits] = useState<Record<number, PdcLineDraft[]>>({});
  /** Edited check no./date by shared PDC key; untouched ones show what is stored. */
  const [sharedPdcEdits, setSharedPdcEdits] = useState<SharedPdcDrafts>({});
  const pdcInvoices = (detail.data?.invoices ?? []).map((inv, i) => ({
    id: inv.id,
    label: `Invoice ${i + 1}${inv.invoice_no ? ` (${inv.invoice_no})` : ''}`,
    net: Number(inv.net_amount),
    pdc_group: inv.pdc_group ?? null,
    lines: pdcEdits[inv.id] ?? pdcLinesFromApi(inv.pdc_lines),
  }));
  const sharedPdcs: SharedPdcDrafts = { ...sharedPdcsFromApi(detail.data?.pdc_groups), ...sharedPdcEdits };
  const setSharedPdc = (key: string, patch: Partial<SharedPdcDrafts[string]>) =>
    setSharedPdcEdits((prev) => ({ ...prev, [key]: { ...sharedPdcs[key]!, ...patch } }));

  const accounts = useSourceAccounts(false, needsSource);
  const assignees = useAssignees();
  const defaultAssignee = isPayable
    ? assignees.data?.find((u) => u.default_payable_status_ids?.includes(nextStatus.id))
    : undefined;
  const anytimeAssigneeChoices = useMemo(() => {
    const all = assignees.data ?? [];
    const bound = all.filter((u) => u.default_payable_status_ids?.includes(nextStatus.id));
    return bound.length > 0 ? bound : all;
  }, [assignees.data, nextStatus.id]);

  useEffect(() => {
    setRemarks('');
    setReference(payable.payment_reference ?? '');
    setPaidAt(payable.paid_at ?? '');
    setCheckDate(payable.check_date ?? '');
    setSourceAccountId(payable.source_account_id ? String(payable.source_account_id) : '');
    setCustomFieldValues({});
    setFiles([]);
    setError(null);
    setPdcEdits({});
    setSharedPdcEdits({});

    if (isAnytimeStatus) {
      const bound = (assignees.data ?? []).filter((u) =>
        u.default_payable_status_ids?.includes(nextStatus.id),
      );
      const choices = bound.length > 0 ? bound : (assignees.data ?? []);
      if (payable.assigned_to != null && choices.some((u) => u.id === payable.assigned_to)) {
        setAssignedTo(String(payable.assigned_to));
      } else if (choices.length === 1) {
        setAssignedTo(String(choices[0]!.id));
      } else {
        setAssignedTo('');
      }
    } else {
      setAssignedTo(payable.assigned_to != null ? String(payable.assigned_to) : '');
    }
  }, [payable, nextStatus, isAnytimeStatus, assignees.data]);

  useEffect(() => {
    if (!needsSource || sourceAccountId || !accounts.data?.length) return;
    if (accounts.data.length === 1) setSourceAccountId(String(accounts.data[0]!.id));
  }, [needsSource, sourceAccountId, accounts.data]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (needsRemarks && !remarks.trim()) {
      setError('Remarks are required when cancelling.');
      return;
    }
    if (isPaid && payable.requires_reference && !reference.trim()) {
      setError(`A payment reference is required for ${payable.payment_method_name} payments.`);
      return;
    }
    if (isPaid && !checkDate) {
      setError('Check date is required when marking as paid.');
      return;
    }
    if (needsSource && !sourceAccountId) {
      setError(ledger.reserveMissing);
      return;
    }
    if (isAnytimeStatus && !assignedTo) {
      setError(`Choose who to assign when moving to “${nextStatus.name}”.`);
      return;
    }
    if (canReassign && !auth.isAdmin && !assignedTo) {
      setError('Choose who to assign this to (or keep yourself selected).');
      return;
    }
    for (const field of customFields) {
      const value = customFieldValues[String(field.id)]?.trim() || '';
      if (!value) {
        setError(`${field.label} is required.`);
        return;
      }
    }
    if (requireFile && files.length === 0 && payable.attachment_count < 1) {
      setError('Upload at least one file before setting this status.');
      return;
    }
    if (needsPdc) {
      if (!detail.data) {
        setError('Invoice PDC schedules are still loading.');
        return;
      }
      for (const inv of pdcInvoices) {
        const problem = inv.pdc_group ? null : pdcScheduleProblem(inv.lines, inv.net);
        if (problem) {
          setError(`${inv.label}: ${problem}`);
          return;
        }
      }
    }

    const initialAssigned = payable.assigned_to != null ? String(payable.assigned_to) : '';
    const nextAssigned = isAnytimeStatus
      ? Number(assignedTo)
      : isPayable
        ? undefined
        : !canReassign
          ? undefined
          : assignedTo === initialAssigned
            ? undefined
            : assignedTo
              ? Number(assignedTo)
              : auth.isAdmin
                ? null
                : payable.assigned_to;

    const resolvedCustomValues: Record<string, string> = {};
    for (const field of customFields) {
      resolvedCustomValues[String(field.id)] = customFieldValues[String(field.id)]!.trim();
    }

    try {
      if (requireFile && files.length > 0) {
        setUploading(true);
        const fd = new FormData();
        for (const f of files) fd.append('files', f);
        await api.post(`${ledger.apiBase}/${payable.id}/attachments`, fd);
      }
      onConfirm({
        remarks: remarks.trim(),
        payment_reference: reference.trim() || null,
        paid_at: isPaid ? paidAt || null : null,
        check_date: isPaid ? checkDate : null,
        source_account_id: needsSource
          ? Number(sourceAccountId)
          : payable.source_account_id ?? undefined,
        assigned_to: nextAssigned,
        custom_field_values: resolvedCustomValues,
        ...(needsPdc
          ? {
              pdc: {
                invoices: pdcInvoices.map((inv) => ({
                  id: inv.id,
                  ...invoicePdcPayload({ pdc_group: inv.pdc_group, pdc_lines: inv.lines }),
                })),
                pdc_groups: sharedPdcsPayload(pdcInvoices, sharedPdcs),
              },
            }
          : {}),
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const busy = pending || uploading;

  return (
    <Modal title={`Change status → ${nextStatus.name}`} onClose={busy ? () => undefined : onClose}>
      <form className="status-change-form" onSubmit={onSubmit}>
        {isPayable && (
          <WorkflowStepper
            statuses={workflowStatuses.data}
            currentStatusId={payable.status_id}
            isDraft={payable.is_draft}
          />
        )}
        <p className="muted">
          #{payable.id} {payable.client_name}
          {payable.invoice_no ? ` · ${payable.invoice_no}` : ''} · {formatMoney(payable.amount)}
        </p>

        {needsPdc && detail.isLoading && <p className="muted small">Loading invoice PDC schedules...</p>}
        {needsPdc && detail.error && <ErrorBox error={errorMessage(detail.error)} />}
        {needsPdc &&
          pdcInvoices
            .filter((inv) => !inv.pdc_group)
            .map((inv) => (
              <div key={inv.id} className="invoice-row">
                <div className="invoice-row-title">
                  {inv.label} · net {formatMoney(inv.net)}
                </div>
                <PdcSchedulePanel
                  lines={inv.lines}
                  onChange={(lines) => setPdcEdits((prev) => ({ ...prev, [inv.id]: lines }))}
                  netAmount={inv.net}
                  describedById={`status-pdc-total-${inv.id}`}
                />
              </div>
            ))}
        {needsPdc &&
          detail.data?.pdc_groups?.map((group) => (
            <div key={group.key} className="invoice-row">
              <div className="invoice-row-title">Shared PDC · {formatMoney(group.amount)}</div>
              <p className="muted small">
                One check for{' '}
                {pdcInvoices
                  .filter((inv) => inv.pdc_group === group.key)
                  .map((inv) => inv.label)
                  .join(', ')}
              </p>
              <div className="entry-sheet-grid">
                <label className="field">
                  <span className="field-label">PDC no.</span>
                  <input
                    value={sharedPdcs[group.key]?.pdc_no ?? ''}
                    onChange={(e) => setSharedPdc(group.key, { pdc_no: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">PDC date</span>
                  <input
                    type="date"
                    value={sharedPdcs[group.key]?.pdc_date ?? ''}
                    onChange={(e) => setSharedPdc(group.key, { pdc_date: e.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}

        <label>
          Remarks {needsRemarks ? '*' : '(optional)'}
          <textarea
            rows={3}
            value={remarks}
            required={needsRemarks}
            placeholder={needsRemarks ? 'Reason for cancellation' : 'Optional note for this status change'}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </label>

        {customFields.map((field) => (
          <label key={field.id}>
            {field.label} *
            <input
              type={field.field_type === 'date' ? 'date' : 'text'}
              value={customFieldValues[String(field.id)] ?? ''}
              required
              onChange={(e) =>
                setCustomFieldValues((prev) => ({ ...prev, [String(field.id)]: e.target.value }))
              }
            />
          </label>
        ))}

        {requireFile && (
          <label>
            File upload *
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            <span className="hint">
              {payable.attachment_count > 0
                ? `This payable already has ${payable.attachment_count} file(s). You can add more.`
                : 'At least one file is required for this status.'}
            </span>
          </label>
        )}

        {needsSource && (
          <label>
            Source account *
            <select
              required
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              disabled={accounts.isLoading}
            >
              <option value="">Select account...</option>
              {accounts.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bank_name} · {a.account_number}
                  {a.available_balance != null ? ` (avail. ${formatMoney(a.available_balance)})` : ''}
                </option>
              ))}
            </select>
            <span className="hint">{ledger.reserveHint}</span>
            {accounts.error && <ErrorBox error={errorMessage(accounts.error)} />}
          </label>
        )}

        {isPaid && (
          <>
            <label>
              {ledger.paidOnLabel}
              <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              <span className="hint">Defaults to today if left blank</span>
            </label>
            <label>
              Check date *
              <input type="date" value={checkDate} required onChange={(e) => setCheckDate(e.target.value)} />
            </label>
            <label>
              Check no. / transaction ref. {payable.requires_reference ? '*' : ''}
              <input
                value={reference}
                required={payable.requires_reference}
                placeholder="Check no. / transaction ref"
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
          </>
        )}

        {isPayable && !isAnytimeStatus && (
          <p className="muted small">
            {defaultAssignee
              ? `Will be assigned to ${defaultAssignee.display_name} (default for ${nextStatus.name}).`
              : `Assignee follows the default binding for “${nextStatus.name}” in Users → Permissions.`}
          </p>
        )}

        {isAnytimeStatus && (
          <label>
            Assign to *
            <select
              required
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={assignees.isLoading}
            >
              <option value="">Select user...</option>
              {anytimeAssigneeChoices.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                </option>
              ))}
            </select>
            <span className="hint">
              Anytime status (sort order 0) — choose who should own this payable next.
            </span>
          </label>
        )}

        {canReassign && (
          <label>
            Assign to
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={assignees.isLoading}
            >
              {auth.isAdmin && <option value="">Unassigned</option>}
              {assignees.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                </option>
              ))}
            </select>
            <span className="hint">You can hand this off to another person when changing status.</span>
          </label>
        )}

        <ErrorBox error={error || submitError} />

        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {uploading ? 'Uploading…' : pending ? 'Saving...' : `Set to ${nextStatus.name}`}
          </button>
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>

      <StatusHistoryPanel documentId={payable.id} />
    </Modal>
  );
}

/** Allowed next statuses for a payable row (siblings / adjacent / anytime) — not a permission matrix. */
export function allowedPayableStatusIdsForRow(
  statuses: PayableStatus[] | undefined,
  payable: Pick<Payable, 'status_id'>,
  staffPermittedIds?: number[] | null,
  isAdmin?: boolean,
): number[] {
  let ids = nextStepStatusIds(statuses, payable.status_id);
  if (!isAdmin && staffPermittedIds && staffPermittedIds.length > 0) {
    ids = ids.filter((id) => staffPermittedIds.includes(id));
  }
  return ids;
}

export function useNextStepStatusIds(statuses: PayableStatus[] | undefined, fromId: number) {
  return useMemo(() => nextStepStatusIds(statuses, fromId), [statuses, fromId]);
}
