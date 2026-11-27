import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  attachmentUrl,
  errorMessage,
  type Attachment,
  type EwtKind,
  type Payable,
  type PayableInvoice,
} from '../api';
import { useAuth } from '../auth';
import {
  useAssignees,
  useParties,
  usePaymentMethods,
  usePaymentTerms,
  usePaymentTypes,
  useSourceAccounts,
  useLedgerStatuses,
} from '../hooks';
import { ConfirmDialog, ErrorBox, StatusSelect, type ConfirmRequest } from '../components';
import { allowedPayableStatusIdsForRow } from '../components/StatusChangeModal';
import { StatusHistoryPanel } from '../components/StatusHistoryPanel';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { PdcSchedulePanel } from '../components/PdcSchedulePanel';
import { addDays, formatAmountPlain, formatMoney } from '../format';
import { isPdcPaymentMethodName, newPdcLine, sumPdcAmounts, type PdcLineDraft } from '../lib/pdc';
import { isReserveStatus, useLedger } from '../ledger';
import { computeTaxAmounts, DEFAULT_VAT_RATE, EWT_RATES, moneyString, parseGross, roundMoney } from '../tax';
import { isFuelType } from '../components/FuelDetails';

const MAX_MB = 10;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

interface InvoiceDraft {
  key: string;
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  /** Empty string = no term (manual due). Number string = selected term id. */
  payment_term_id: string;
  gross_amount: string;
}

function splitAmounts(total: number, n: number): string[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const parts = Array.from({ length: n }, () => base);
  parts[n - 1]! += cents - base * n;
  return parts.map((c) => (c / 100).toFixed(2));
}

interface FormState {
  client_id: string;
  payment_type_id: string;
  payment_method_id: string;
  description: string;
  status_id: string;
  paid_at: string;
  check_date: string;
  payment_reference: string;
  status_remarks: string;
  apply_vat: boolean;
  vat_rate: string;
  apply_ewt: boolean;
  ewt_kind: EwtKind;
  assigned_to: string;
  source_account_id: string;
  fuel_liters: string;
  fuel_price_per_liter: string;
  fuel_order_date: string;
  fuel_delivery_date: string;
  fuel_delivery_receipt: string;
}

const EMPTY: FormState = {
  client_id: '',
  payment_type_id: '',
  payment_method_id: '',
  description: '',
  status_id: '',
  paid_at: '',
  check_date: '',
  payment_reference: '',
  status_remarks: '',
  apply_vat: true,
  vat_rate: String(DEFAULT_VAT_RATE),
  apply_ewt: true,
  ewt_kind: 'service',
  assigned_to: '',
  source_account_id: '',
  fuel_liters: '',
  fuel_price_per_liter: '',
  fuel_order_date: '',
  fuel_delivery_date: '',
  fuel_delivery_receipt: '',
};

function newInvoice(partial?: Partial<InvoiceDraft>): InvoiceDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    invoice_no: '',
    invoice_date: '',
    due_date: '',
    payment_term_id: '',
    gross_amount: '',
    ...partial,
  };
}

function fromPayable(p: Payable): { form: FormState; invoices: InvoiceDraft[] } {
  const termDefault = p.payment_term_id ? String(p.payment_term_id) : '';
  const lines =
    p.invoices && p.invoices.length > 0
      ? p.invoices.map((inv: PayableInvoice) =>
          newInvoice({
            invoice_no: inv.invoice_no ?? '',
            invoice_date: inv.invoice_date ?? '',
            due_date: inv.due_date ?? '',
            payment_term_id: inv.payment_term_id ? String(inv.payment_term_id) : '',
            gross_amount: inv.gross_amount,
          }),
        )
      : [
          newInvoice({
            invoice_no: p.invoice_no ?? '',
            invoice_date: p.invoice_date ?? '',
            due_date: p.due_date,
            payment_term_id: termDefault,
            gross_amount: p.gross_amount ?? p.amount,
          }),
        ];

  return {
    form: {
      client_id: String(p.client_id),
      payment_type_id: String(p.payment_type_id),
      payment_method_id: String(p.payment_method_id),
      description: p.description ?? '',
      status_id: String(p.status_id),
      paid_at: p.paid_at ?? '',
      check_date: p.check_date ?? '',
      payment_reference: p.payment_reference ?? '',
      status_remarks: '',
      apply_vat: Boolean(p.apply_vat),
      vat_rate: String(p.vat_rate ?? DEFAULT_VAT_RATE),
      apply_ewt: Boolean(p.apply_ewt),
      ewt_kind: p.ewt_kind ?? 'service',
      assigned_to: p.assigned_to ? String(p.assigned_to) : '',
      source_account_id: p.source_account_id ? String(p.source_account_id) : '',
      fuel_liters: p.fuel_liters ?? '',
      fuel_price_per_liter: p.fuel_price_per_liter ?? '',
      fuel_order_date: p.fuel_order_date ?? '',
      fuel_delivery_date: p.fuel_delivery_date ?? '',
      fuel_delivery_receipt: p.fuel_delivery_receipt ?? '',
    },
    invoices: lines,
  };
}

function lineTotals(
  invoices: InvoiceDraft[],
  applyVat: boolean,
  vatRate: number,
  applyEwt: boolean,
  ewtKind: EwtKind,
) {
  const ewtRate = EWT_RATES[ewtKind];
  let gross = 0;
  let vat = 0;
  let netSales = 0;
  let ewt = 0;
  let net = 0;
  const rows = invoices.map((inv) => {
    const g = parseGross(inv.gross_amount);
    if (!Number.isFinite(g) || g <= 0) {
      return { ...inv, vatAmount: 0, ewtAmount: 0, netOfVat: 0, netAmount: 0, valid: false };
    }
    const calc = computeTaxAmounts(g, { applyVat, vatRate, applyEwt, ewtRate });
    gross += g;
    vat += calc.vatAmount;
    netSales += calc.netOfVat;
    ewt += calc.ewtAmount;
    net += calc.netAmount;
    return { ...inv, ...calc, valid: calc.netAmount > 0 };
  });
  return {
    rows,
    gross: moneyString(gross),
    vat: moneyString(vat),
    netSales: moneyString(netSales),
    ewt: moneyString(ewt),
    net: moneyString(net),
  };
}

export default function PayableFormPage() {
  const ledger = useLedger();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const auth = useAuth();

  const clients = useParties(ledger.partyEndpoint, true);
  const types = usePaymentTypes(true);
  const methods = usePaymentMethods(true);
  const terms = usePaymentTerms(true);
  const statuses = useLedgerStatuses(ledger.statusEndpoint);
  const assignees = useAssignees();
  const sourceAccounts = useSourceAccounts();

  const existing = useQuery({
    queryKey: ['ledger', ledger.kind, 'detail', Number(id)],
    queryFn: () => api.get<Payable>(`${ledger.apiBase}/${id}`),
    enabled: isEdit,
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [invoices, setInvoices] = useState<InvoiceDraft[]>([newInvoice()]);
  /** Create only: total amount before optional equal split into N payables. */
  const [headerAmount, setHeaderAmount] = useState('');
  const [splitSeparate, setSplitSeparate] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  /** Shared uploads (one payable / edit). */
  const [files, setFiles] = useState<File[]>([]);
  /** Per-invoice uploads when creating several separate payable rows. */
  const [invoiceFiles, setInvoiceFiles] = useState<Record<string, File[]>>({});
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [initialStatusId, setInitialStatusId] = useState<string>('');
  const [pdcLines, setPdcLines] = useState<PdcLineDraft[]>([]);

  useEffect(() => {
    if (existing.data) {
      const loaded = fromPayable(existing.data);
      setForm(loaded.form);
      setInvoices(loaded.invoices);
      setHeaderAmount(loaded.invoices[0]?.gross_amount ?? existing.data.gross_amount ?? '');
      setSplitSeparate(false);
      setInitialStatusId(loaded.form.status_id);
      setPdcLines(
        existing.data.pdc_lines?.map((line) =>
          newPdcLine({
            pdc_no: line.pdc_no ?? '',
            pdc_date: line.pdc_date ?? '',
            amount: line.amount,
          }),
        ) ?? [],
      );
    }
  }, [existing.data]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const setInvoice = (key: string, patch: Partial<InvoiceDraft>) =>
    setInvoices((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const perInvoiceUploads = !isEdit && splitSeparate && invoices.length > 1;

  const rebuildSplitInvoices = (totalStr: string, n: number, termId: string) => {
    const count = Math.max(2, Math.min(100, Math.floor(n) || 2));
    const total = Number(totalStr);
    const amounts =
      Number.isFinite(total) && total > 0
        ? splitAmounts(total, count)
        : Array.from({ length: count }, () => '');
    setInvoices((prev) =>
      Array.from({ length: count }, (_, i) => {
        const existing = prev[i];
        return {
          ...(existing ?? newInvoice({ payment_term_id: termId })),
          payment_term_id: existing?.payment_term_id || termId,
          gross_amount: amounts[i] ?? '',
        };
      }),
    );
  };

  const supplier = clients.data?.find((c) => String(c.id) === form.client_id);
  const supplierTermId = supplier?.payment_term_id ? String(supplier.payment_term_id) : '';

  const applySupplierTermsToInvoices = (clientId: string) => {
    const nextSupplier = clients.data?.find((c) => String(c.id) === clientId);
    const nextTermId = nextSupplier?.payment_term_id ? String(nextSupplier.payment_term_id) : '';
    setInvoices((rows) =>
      rows.map((r) => ({
        ...r,
        payment_term_id: nextTermId,
        ...(nextTermId ? { due_date: '' } : {}),
      })),
    );
  };

  const termForInvoice = (inv: InvoiceDraft) =>
    inv.payment_term_id ? terms.data?.find((t) => String(t.id) === inv.payment_term_id) : undefined;

  const dueForInvoice = (inv: InvoiceDraft) => {
    const t = termForInvoice(inv);
    return t && inv.invoice_date ? addDays(inv.invoice_date, t.days) : inv.due_date;
  };

  // New payables start on the first active "open" status (assignee follows status→user binding).
  useEffect(() => {
    if (isEdit || form.status_id || !statuses.data) return;
    const first = statuses.data.find((s) => s.active && s.category === 'open');
    if (first) setForm((f) => ({ ...f, status_id: String(first.id) }));
  }, [isEdit, form.status_id, statuses.data]);

  const selectedStatus = statuses.data?.find((s) => String(s.id) === form.status_id);
  const isPayable = ledger.kind === 'payable';
  const isPaid = selectedStatus?.category === 'paid';
  const isPaidLike = Boolean(isPaid || selectedStatus?.name.toLowerCase().includes('deposit'));
  const isCancelled = selectedStatus?.category === 'cancelled';
  const isAnytimeStatus = Boolean(isPayable && selectedStatus && selectedStatus.sort_order === 0);
  const isScheduled = Boolean(selectedStatus && isReserveStatus(selectedStatus.name, ledger.reserveName));
  const statusChanged = isEdit && form.status_id && form.status_id !== initialStatusId;
  const remarksRequired = Boolean(statusChanged && isCancelled);
  const anytimeAssigneeChoices = useMemo(() => {
    const all = assignees.data ?? [];
    if (!selectedStatus) return all;
    const bound = all.filter((u) => u.default_payable_status_ids?.includes(selectedStatus.id));
    return bound.length > 0 ? bound : all;
  }, [assignees.data, selectedStatus]);

  // When moving to an anytime status, prompt for assignee (prefill current/single bound).
  useEffect(() => {
    if (!isAnytimeStatus || !statusChanged) return;
    const choices = anytimeAssigneeChoices;
    const current = form.assigned_to ? Number(form.assigned_to) : null;
    if (current != null && choices.some((u) => u.id === current)) return;
    if (choices.length === 1) {
      setForm((f) => ({ ...f, assigned_to: String(choices[0]!.id) }));
      return;
    }
    setForm((f) => ({ ...f, assigned_to: '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when status becomes anytime
  }, [isAnytimeStatus, statusChanged, selectedStatus?.id, anytimeAssigneeChoices]);

  const method = methods.data?.find((m) => String(m.id) === form.payment_method_id);
  const selectedType = types.data?.find((t) => String(t.id) === form.payment_type_id);
  const isFuel = ledger.fuel && isFuelType(selectedType?.name);
  const fuelTotal = useMemo(() => {
    const liters = Number(form.fuel_liters);
    const price = Number(form.fuel_price_per_liter);
    if (!isFuel || !Number.isFinite(liters) || !Number.isFinite(price) || liters <= 0 || price <= 0) return null;
    return moneyString(roundMoney(liters * price));
  }, [isFuel, form.fuel_liters, form.fuel_price_per_liter]);

  useEffect(() => {
    if (!isFuel || !fuelTotal) return;
    setInvoices((rows) => {
      if (!rows.length || rows[0].gross_amount === fuelTotal) return rows;
      return rows.map((row, i) => (i === 0 ? { ...row, gross_amount: fuelTotal } : row));
    });
  }, [isFuel, fuelTotal]);

  const vatRate = Number(form.vat_rate) || DEFAULT_VAT_RATE;
  const totals = useMemo(
    () => lineTotals(invoices, form.apply_vat, vatRate, form.apply_ewt, form.ewt_kind),
    [invoices, form.apply_vat, vatRate, form.apply_ewt, form.ewt_kind],
  );
  const needsPdcSchedule = isPayable && isPdcPaymentMethodName(method?.name);
  const payableNet = Number(totals.net || headerAmount || existing.data?.amount || 0);

  const previews = useMemo(
    () => files.map((f) => ({ file: f, url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null })),
    [files],
  );
  useEffect(() => () => previews.forEach((p) => p.url && URL.revokeObjectURL(p.url)), [previews]);

  const invoicePreviewMap = useMemo(() => {
    const map: Record<string, { file: File; url: string | null }[]> = {};
    for (const [key, list] of Object.entries(invoiceFiles)) {
      map[key] = list.map((f) => ({ file: f, url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null }));
    }
    return map;
  }, [invoiceFiles]);
  useEffect(
    () => () => {
      for (const list of Object.values(invoicePreviewMap)) {
        list.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      }
    },
    [invoicePreviewMap],
  );

  const pickAccepted = (list: FileList | null) => {
    if (!list) return { accepted: [] as File[], rejected: [] as string[] };
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const f of Array.from(list)) {
      if (!ACCEPT.split(',').includes(f.type)) rejected.push(`${f.name} (unsupported type)`);
      else if (f.size > MAX_MB * 1024 * 1024) rejected.push(`${f.name} (over ${MAX_MB} MB)`);
      else accepted.push(f);
    }
    return { accepted, rejected };
  };

  const addFiles = (list: FileList | null) => {
    const { accepted, rejected } = pickAccepted(list);
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    setError(rejected.length ? `Skipped: ${rejected.join(', ')}` : null);
  };

  const addInvoiceFiles = (key: string, list: FileList | null) => {
    const { accepted, rejected } = pickAccepted(list);
    if (accepted.length) {
      setInvoiceFiles((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...accepted] }));
    }
    setError(rejected.length ? `Skipped: ${rejected.join(', ')}` : null);
  };

  const uploadFiles = async (payableId: number, list: File[]) => {
    if (!list.length) return;
    const fd = new FormData();
    list.forEach((f) => fd.append('files', f));
    await api.post<Attachment[]>(`${ledger.apiBase}/${payableId}/attachments`, fd);
  };

  const buildInvoicePayload = () =>
    invoices.map((inv, index) => {
      const hasTerm = Boolean(inv.payment_term_id);
      const gross = isFuel && index === 0 && fuelTotal ? fuelTotal : inv.gross_amount.replace(/,/g, '');
      return {
        invoice_no: inv.invoice_no || null,
        invoice_date: inv.invoice_date || null,
        payment_term_id: inv.payment_term_id ? Number(inv.payment_term_id) : null,
        due_date: hasTerm ? null : inv.due_date || null,
        gross_amount: gross,
      };
    });

  const save = useMutation({
    mutationFn: async (isDraft: boolean) => {
      if (isFuel) {
        if (!fuelTotal) throw new Error('Enter liters and a price per liter greater than zero');
        if (!form.fuel_order_date) throw new Error('Order date is required for fuel');
        if (!form.fuel_delivery_date) throw new Error('Delivery date is required for fuel');
        if (!form.fuel_delivery_receipt.trim()) throw new Error('Delivery receipt number is required for fuel');
        if (invoices.length !== 1) throw new Error(`A fuel ${ledger.doc} uses one invoice line`);
      }
      if (invoices.some((inv, i) => (isFuel && i === 0 ? !fuelTotal : !parseGross(inv.gross_amount) || parseGross(inv.gross_amount) <= 0))) {
        throw new Error('Each invoice needs a gross amount greater than zero');
      }
      if (invoices.some((inv) => inv.payment_term_id && !inv.invoice_date)) {
        throw new Error('Invoice date is required on each invoice that has a payment term');
      }
      if (invoices.some((inv) => !inv.payment_term_id && !inv.due_date)) {
        throw new Error('Enter the due date on each invoice without a payment term');
      }
      if (remarksRequired && !form.status_remarks.trim()) {
        throw new Error('Remarks are required when cancelling');
      }
      if (form.apply_ewt && !form.ewt_kind) {
        throw new Error('Select products or service for EWT');
      }
      if (isScheduled && !form.source_account_id) {
        throw new Error(`Select a source account when status is ${selectedStatus?.name ?? ledger.reserveName}`);
      }
      if (isPayable && !isDraft && isPaidLike && !form.check_date) {
        throw new Error('Check date is required when submitting a deposited/paid payable');
      }

      const shared = {
        client_id: form.client_id,
        payment_type_id: form.payment_type_id,
        payment_method_id: form.payment_method_id,
        description: form.description || null,
        status_id: form.status_id || null,
        paid_at: isPaid ? form.paid_at || null : null,
        check_date: isPayable && isPaidLike ? form.check_date || null : null,
        is_draft: isPayable ? isDraft : false,
        payment_reference: form.payment_reference || null,
        apply_vat: form.apply_vat,
        vat_rate: vatRate,
        apply_ewt: form.apply_ewt,
        ewt_kind: form.apply_ewt ? form.ewt_kind : null,
        status_remarks: statusChanged ? form.status_remarks || null : null,
        // Payables: anytime (sort 0) requires explicit assignee; workflow steps auto-bind (1:1).
        // Admin may still override assignee without a status change.
        assigned_to: isPayable
          ? isAnytimeStatus && (statusChanged || !isEdit || existing.data?.is_draft)
            ? form.assigned_to
              ? Number(form.assigned_to)
              : null
            : auth.isAdmin
              ? (() => {
                  const next = form.assigned_to ? Number(form.assigned_to) : null;
                  if (!isEdit) return next;
                  const prev = existing.data?.assigned_to ?? null;
                  return next !== prev ? next : undefined;
                })()
              : undefined
          : auth.isAdmin ||
              (isEdit &&
                existing.data?.assigned_to != null &&
                existing.data.assigned_to === auth.user?.id)
            ? form.assigned_to
              ? Number(form.assigned_to)
              : undefined
            : undefined,
        source_account_id: isScheduled
          ? Number(form.source_account_id)
          : existing.data?.source_account_id ?? null,
        fuel_liters: isFuel ? form.fuel_liters : null,
        fuel_price_per_liter: isFuel ? form.fuel_price_per_liter : null,
        fuel_order_date: isFuel ? form.fuel_order_date || null : null,
        fuel_delivery_date: isFuel ? form.fuel_delivery_date || null : null,
        fuel_delivery_receipt: isFuel ? form.fuel_delivery_receipt.trim() || null : null,
      };

      if (!isEdit && splitSeparate && invoices.length > 1) {
        const batch = await api.post<{ items: Payable[]; count: number }>(`${ledger.apiBase}/batch`, {
          ...shared,
          invoices: buildInvoicePayload(),
        });
        try {
          for (let i = 0; i < batch.items.length; i++) {
            await uploadFiles(batch.items[i]!.id, invoiceFiles[invoices[i]!.key] ?? []);
          }
        } catch (e) {
          throw new Error(`Created ${batch.count} ${ledger.docs} but upload failed: ${errorMessage(e)}`);
        }
        return batch.items[0];
      }

      const body = {
        ...shared,
        invoices: isEdit
          ? buildInvoicePayload()
          : buildInvoicePayload().map((inv, idx) =>
              idx === 0 && !isFuel
                ? { ...inv, gross_amount: headerAmount || inv.gross_amount }
                : inv,
            ),
        ...(isPayable && needsPdcSchedule && !isDraft
          ? {
              pdc_lines: pdcLines.map((line) => ({
                pdc_no: line.pdc_no.trim() || null,
                pdc_date: line.pdc_date || null,
                amount: line.amount.replace(/,/g, ''),
              })),
            }
          : isPayable && pdcLines.length
            ? {
                pdc_lines: pdcLines.map((line) => ({
                  pdc_no: line.pdc_no.trim() || null,
                  pdc_date: line.pdc_date || null,
                  amount: line.amount.replace(/,/g, ''),
                })),
              }
            : {}),
      };

      if (isPayable && needsPdcSchedule && !isDraft) {
        if (!pdcLines.length) throw new Error('Add at least one PDC line.');
        if (Math.abs(sumPdcAmounts(pdcLines) - payableNet) > 0.01) {
          throw new Error('PDC scheduled total must equal the payable net amount.');
        }
      }
      const saved = isEdit ? await api.put<Payable>(`${ledger.apiBase}/${id}`, body) : await api.post<Payable>(ledger.apiBase, body);
      try {
        await uploadFiles(saved.id, files);
      } catch (e) {
        throw new Error(`${ledger.savedUpload(saved.id)}: ${errorMessage(e)}`);
      }
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ledger', ledger.kind] });
      qc.invalidateQueries({ queryKey: ['upcoming', ledger.kind] });
      navigate(ledger.listPath);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const removeAttachment = useMutation({
    mutationFn: (attId: number) => api.del(`/attachments/${attId}`),
    onSuccess: () => {
      setConfirm(null);
      existing.refetch();
      qc.invalidateQueries({ queryKey: ['ledger', ledger.kind] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    save.mutate(false);
  };

  if (isEdit && existing.isLoading) return <p>Loading...</p>;
  if (isEdit && existing.error) return <ErrorBox error={errorMessage(existing.error)} />;

  // Create uses header amount + optional split; edit keeps existing multi-line rows.
  const canEditDoc =
    auth.isAdmin ||
    !isEdit ||
    (existing.data
      ? existing.data.is_draft
        ? existing.data.created_by === auth.user?.id || existing.data.assigned_to === auth.user?.id
        : existing.data.assigned_to === auth.user?.id
      : false);
  const draftActions = canEditDoc && isPayable && (!isEdit || Boolean(existing.data?.is_draft));
  // Payables: only the next workflow step (+ cancel) from the current status.
  const allowedStatusIds =
    isPayable && isEdit && existing.data
      ? allowedPayableStatusIdsForRow(
          statuses.data,
          existing.data,
          auth.user?.payable_status_ids,
          auth.isAdmin,
        )
      : null;
  const showStatusPicker = !isPayable || isEdit || auth.isAdmin;

  return (
    <section className="paper-form-page w-full min-w-0">
      <div className="page-header paper-form-toolbar">
        <Link to={ledger.listPath} className="btn ghost">
          Back to list
        </Link>
      </div>

      <form
        className={`card form-grid paper-form w-full min-w-0 gap-3${!canEditDoc ? ' form-readonly' : ''}`}
        onSubmit={(e) => {
          if (!canEditDoc) {
            e.preventDefault();
            return;
          }
          onSubmit(e);
        }}
      >
        {isPayable && isEdit && existing.data && !existing.data.is_draft && (
          <WorkflowStepper
            statuses={statuses.data}
            currentStatusId={existing.data.status_id}
          />
        )}
        <div className="paper-form-title span-all min-w-0">
          <h1>
            {isEdit
              ? canEditDoc
                ? `Edit ${ledger.doc} #${id}`
                : `${ledger.doc} #${id}`
              : ledger.newTitle}
          </h1>
          <p className="muted">
            {!canEditDoc
              ? `You created this ${ledger.doc.toLowerCase()}; it is assigned to someone else so you can view it only.`
              : isEdit
                ? `Update the fields below, then save your changes.`
                : `Fill out this form like a paper voucher, then save as draft or submit.`}
          </p>
        </div>

        <div className="form-section span-all min-w-0">
          <h2 className="form-section-title">1. Party</h2>
          <label className="field w-full min-w-0">
            <span className="field-label">{ledger.party} *</span>
          <select
            required
            value={form.client_id}
            onChange={(e) => {
              set('client_id', e.target.value);
              applySupplierTermsToInvoices(e.target.value);
            }}
          >
            <option value="">Select {ledger.partyLower}...</option>
            {clients.data
              ?.filter((c) => c.active || String(c.id) === form.client_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          {clients.data?.length === 0 && (
            <span className="hint">
              {ledger.noParties} <Link to="/payables/suppliers">Suppliers</Link>.
            </span>
          )}
          </label>
        </div>

        <div className="form-section span-all min-w-0">
          <h2 className="form-section-title">2. Payment</h2>
          <div className="form-section-grid w-full min-w-0 gap-3">
        <label className="field w-full min-w-0">
          <span className="field-label">Payment type *</span>
          <select required value={form.payment_type_id} onChange={(e) => set('payment_type_id', e.target.value)}>
            <option value="">Select type...</option>
            {types.data
              ?.filter((t) => t.active || String(t.id) === form.payment_type_id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Payment format *</span>
          <select required value={form.payment_method_id} onChange={(e) => set('payment_method_id', e.target.value)}>
            <option value="">Select method...</option>
            {methods.data
              ?.filter((m) => m.active || String(m.id) === form.payment_method_id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
          </div>
        </div>

        {isFuel && (
          <div className="form-section span-all">
            <h2 className="form-section-title">Fuel details</h2>
            <div className="form-section-grid">
              <label className="field">
                <span className="field-label">Liters *</span>
                <input
                  required
                  inputMode="decimal"
                  placeholder="0.000"
                  value={form.fuel_liters}
                  onChange={(e) => set('fuel_liters', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Price per liter *</span>
                <input
                  required
                  inputMode="decimal"
                  placeholder="0.0000"
                  value={form.fuel_price_per_liter}
                  onChange={(e) => set('fuel_price_per_liter', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Order date *</span>
                <input
                  required
                  type="date"
                  value={form.fuel_order_date}
                  onChange={(e) => set('fuel_order_date', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Delivery date *</span>
                <input
                  required
                  type="date"
                  value={form.fuel_delivery_date}
                  onChange={(e) => set('fuel_delivery_date', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Delivery receipt number *</span>
                <input
                  required
                  value={form.fuel_delivery_receipt}
                  onChange={(e) => set('fuel_delivery_receipt', e.target.value)}
                />
              </label>
              <div className="invoice-calc">
                Total amount:{' '}
                <strong>{fuelTotal ? formatMoney(fuelTotal) : '—'}</strong>
                <div className="muted small">Liters × price per liter. This is the invoice gross.</div>
              </div>
            </div>
          </div>
        )}

        <div className="form-section span-all">
          <h2 className="form-section-title">3. Assignment / Status</h2>
          <div className="form-section-grid">
        {showStatusPicker && <label className="field">
          <span className="field-label">Status</span>
          <StatusSelect
            statuses={statuses.data}
            value={form.status_id ? Number(form.status_id) : ''}
            placeholder={form.status_id ? undefined : 'Select status...'}
            allowedIds={allowedStatusIds}
            onChange={(s) => set('status_id', String(s.id))}
          />
        </label>}

        {isScheduled && (
          <label className="field">
            <span className="field-label">Source account *</span>
            <select
              required
              value={form.source_account_id}
              onChange={(e) => set('source_account_id', e.target.value)}
            >
              <option value="">Select account...</option>
              {sourceAccounts.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bank_name} · {a.account_number}
                  {a.available_balance != null ? ` (avail. ${formatMoney(a.available_balance)})` : ''}
                </option>
              ))}
            </select>
            <span className="hint">{ledger.reserveSaveHint}</span>
          </label>
        )}

        {isPaid && (
          <label className="field">
            <span className="field-label">{ledger.paidOnLabel}</span>
            <input type="date" value={form.paid_at} onChange={(e) => set('paid_at', e.target.value)} />
            <span className="hint">Defaults to today</span>
          </label>
        )}

        {isPayable && isPaidLike && (
          <label className="field">
            <span className="field-label">Check date *</span>
            <input
              type="date"
              value={form.check_date}
              onChange={(e) => set('check_date', e.target.value)}
            />
          </label>
        )}

        {(isPaidLike || method?.requires_reference) && (
          <label className="field">
            <span className="field-label">
              Check no. {method?.requires_reference && isPaid ? '*' : ''}
            </span>
            <input
              placeholder="Check number"
              value={form.payment_reference}
              required={Boolean(method?.requires_reference && isPaid)}
              onChange={(e) => set('payment_reference', e.target.value)}
            />
          </label>
        )}

        {isPayable ? (
          <label className="field">
            <span className="field-label">
              Assigned to{isAnytimeStatus && (statusChanged || !isEdit) ? ' *' : ''}
            </span>
            {isAnytimeStatus && (statusChanged || !isEdit || auth.isAdmin) ? (
              <>
                <select
                  value={form.assigned_to}
                  onChange={(e) => set('assigned_to', e.target.value)}
                  disabled={!canEditDoc}
                  required={statusChanged || !isEdit}
                >
                  <option value="">Select user...</option>
                  {anytimeAssigneeChoices.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
                <span className="hint">
                  Anytime status (sort order 0) — choose who should own this payable.
                </span>
              </>
            ) : auth.isAdmin ? (
              <>
                <select
                  value={form.assigned_to}
                  onChange={(e) => set('assigned_to', e.target.value)}
                  disabled={!canEditDoc}
                >
                  <option value="">Unassigned</option>
                  {assignees.data?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.display_name}
                    </option>
                  ))}
                </select>
                <span className="hint">
                  Workflow statuses auto-assign to their one bound user on status change. Admin can
                  override here without changing status.
                </span>
              </>
            ) : (
              (() => {
                const boundUsers =
                  assignees.data?.filter((u) =>
                    u.default_payable_status_ids?.includes(Number(form.status_id)),
                  ) ?? [];
                const value =
                  isEdit && existing.data?.assigned_to != null
                    ? String(existing.data.assigned_to)
                    : boundUsers.length === 1
                      ? String(boundUsers[0]!.id)
                      : '';
                return (
                  <>
                    <select value={value} disabled>
                      {!value && (
                        <option value="">
                          {boundUsers.length
                            ? 'Assigned from status binding'
                            : 'No default user for this status'}
                        </option>
                      )}
                      {assignees.data?.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.display_name}
                        </option>
                      ))}
                    </select>
                    <span className="hint">
                      Auto-assigned from Users → default status binding (1 user per workflow step).
                    </span>
                  </>
                );
              })()
            )}
          </label>
        ) : (
          (auth.isAdmin ||
            (isEdit &&
              existing.data?.assigned_to != null &&
              existing.data.assigned_to === auth.user?.id)) && (
            <label className="field">
              <span className="field-label">Assigned to</span>
              <select value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
                {auth.isAdmin && <option value="">Unassigned</option>}
                {assignees.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
              <span className="hint">
                {auth.isAdmin
                  ? ledger.assigneeHint
                  : 'As the assignee, you can hand this off to another person.'}
              </span>
            </label>
          )
        )}

        {statusChanged && (
          <label className="field span-all">
            <span className="field-label">Status change remarks {remarksRequired ? '*' : '(optional)'}</span>
            <textarea
              rows={2}
              required={remarksRequired}
              value={form.status_remarks}
              placeholder={remarksRequired ? 'Reason for cancellation' : 'Optional note for this status change'}
              onChange={(e) => set('status_remarks', e.target.value)}
            />
          </label>
        )}

        {isEdit && id != null && (
          <div className="span-all">
            <StatusHistoryPanel documentId={Number(id)} defaultOpen={auth.isAdmin} />
          </div>
        )}
          </div>
        </div>

        <div className="form-section span-all">
          <h2 className="form-section-title">4. Invoices</h2>
          <p className="hint">
            {ledger.termsHint}
            {!supplierTermId && form.client_id ? (
              <>
                {' '}
                {ledger.noDefaultTerm}{' '}
                <Link to="/payables/suppliers">Suppliers</Link>.
              </>
            ) : null}
          </p>
        <div className="tax-options">
          <div className="field-label">Taxes</div>
          <div className="tax-row">
            <label className="checkbox">
              <input type="checkbox" checked={form.apply_vat} onChange={(e) => set('apply_vat', e.target.checked)} />
              Apply VAT
            </label>
            {form.apply_vat && (
              <label className="inline-rate">
                Rate %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.vat_rate}
                  onChange={(e) => set('vat_rate', e.target.value)}
                />
              </label>
            )}
          </div>
          <div className="tax-row">
            <label className="checkbox">
              <input type="checkbox" checked={form.apply_ewt} onChange={(e) => set('apply_ewt', e.target.checked)} />
              Apply EWT
            </label>
            {form.apply_ewt && (
              <label className="inline-rate">
                Kind
                <select value={form.ewt_kind} onChange={(e) => set('ewt_kind', e.target.value as EwtKind)}>
                  <option value="products">Products (1%)</option>
                  <option value="service">Service (2%)</option>
                </select>
              </label>
            )}
          </div>
          <p className="hint">
            VAT = gross ÷ (1 + rate) × rate. Total net sales = gross − VAT. EWT is that net sales × 1% products / 2%
            service. {ledger.netHint}
          </p>
        </div>

        <div className="span-all invoices-block">
          <div className="invoices-header">
            <div className="field-label">Invoices *</div>
            {isEdit && !isFuel && (
              <button
                type="button"
                className="btn small"
                onClick={() =>
                  setInvoices((rows) => [
                    ...rows,
                    newInvoice({ payment_term_id: supplierTermId }),
                  ])
                }
              >
                + Add invoice
              </button>
            )}
          </div>

          {!isEdit && !isFuel && (
            <div className="entry-sheet-grid" style={{ marginBottom: '0.75rem' }}>
              <label className="field">
                <span className="field-label">Amount (PHP) *</span>
                <input
                  required
                  inputMode="decimal"
                  placeholder="0.00"
                  value={headerAmount}
                  onChange={(e) => {
                    const next = e.target.value;
                    setHeaderAmount(next);
                    if (splitSeparate) rebuildSplitInvoices(next, splitCount, supplierTermId);
                    else setInvoices((rows) => [{ ...rows[0]!, gross_amount: next }]);
                  }}
                  onBlur={(e) => {
                    const preview = formatAmountPlain(e.target.value);
                    if (preview && e.target.value.trim()) setHeaderAmount(preview.replace(/,/g, ''));
                  }}
                />
                {headerAmount && (
                  <span className="muted small">Preview: {formatAmountPlain(headerAmount)}</span>
                )}
              </label>
              <fieldset className="field span-all" style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend className="field-label">Invoice entry mode</legend>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="invoiceMode"
                    checked={!splitSeparate}
                    onChange={() => {
                      setSplitSeparate(false);
                      setInvoices([
                        newInvoice({
                          payment_term_id: supplierTermId,
                          gross_amount: headerAmount,
                        }),
                      ]);
                      setInvoiceFiles({});
                    }}
                  />
                  One payment for multiple invoices (recommended)
                </label>
                <label className="checkbox">
                  <input
                    type="radio"
                    name="invoiceMode"
                    checked={splitSeparate}
                    onChange={() => {
                      setSplitSeparate(true);
                      rebuildSplitInvoices(headerAmount, splitCount, supplierTermId);
                    }}
                  />
                  Separate payable per invoice (advanced)
                </label>
              </fieldset>
              {splitSeparate && (
                <label className="field">
                  <span className="field-label">How many *</span>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    required
                    value={splitCount}
                    onChange={(e) => {
                      const n = Number(e.target.value) || 2;
                      setSplitCount(n);
                      rebuildSplitInvoices(headerAmount, n, supplierTermId);
                    }}
                  />
                  <span className="hint">Amount is divided equally across {splitCount} payables</span>
                </label>
              )}
            </div>
          )}

          <div className="invoice-rows flex w-full min-w-0 flex-col gap-3">
            {totals.rows.map((row, index) => {
              const draft = invoices.find((i) => i.key === row.key)!;
              const rowTerm = termForInvoice(draft);
              const dueValue = dueForInvoice(draft);
              return (
                <div key={row.key} className="invoice-row paper-invoice-row w-full min-w-0 gap-3">
                  <div className="invoice-row-title">Invoice {index + 1}</div>
                  <label className="field w-full min-w-0">
                    <span className="field-label">Invoice no.</span>
                    <input className="w-full min-w-0" value={row.invoice_no} onChange={(e) => setInvoice(row.key, { invoice_no: e.target.value })} />
                  </label>
                  <label className="field">
                    <span className="field-label">Payment terms</span>
                    <select
                      value={draft.payment_term_id}
                      onChange={(e) =>
                        setInvoice(row.key, {
                          payment_term_id: e.target.value,
                          ...(e.target.value ? { due_date: '' } : {}),
                        })
                      }
                    >
                      <option value="">None (enter due date)</option>
                      {terms.data
                        ?.filter((t) => t.active || String(t.id) === draft.payment_term_id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.days} days)
                            {supplierTermId && String(t.id) === supplierTermId ? ` — ${ledger.partyLower} default` : ''}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Invoice date {rowTerm ? '*' : ''}</span>
                    <input
                      type="date"
                      required={Boolean(rowTerm)}
                      value={row.invoice_date}
                      onChange={(e) => setInvoice(row.key, { invoice_date: e.target.value })}
                    />
                  </label>
                  {rowTerm ? (
                    <label className="field">
                      <span className="field-label">Deadline (due date)</span>
                      <input type="date" readOnly value={dueValue} />
                      <span className="hint">Invoice date + {rowTerm.days} days</span>
                    </label>
                  ) : (
                    <label className="field">
                      <span className="field-label">Deadline (due date) *</span>
                      <input
                        type="date"
                        required
                        value={draft.due_date}
                        onChange={(e) => setInvoice(row.key, { due_date: e.target.value })}
                      />
                      <span className="hint">Manual — no payment term selected</span>
                    </label>
                  )}
                  {isFuel && index === 0 ? (
                    <label className="field">
                      <span className="field-label">Gross amount (PHP)</span>
                      <input readOnly value={fuelTotal ?? ''} placeholder="Enter liters and price" />
                      <span className="hint">Computed from liters × price per liter</span>
                    </label>
                  ) : !isEdit && (splitSeparate || index === 0) ? (
                    <label className="field">
                      <span className="field-label">Gross amount (PHP)</span>
                      <input readOnly value={row.gross_amount} />
                      <span className="hint">
                        {splitSeparate ? 'From equal split of the amount above' : 'From amount above'}
                      </span>
                    </label>
                  ) : (
                    <label className="field">
                      <span className="field-label">Gross amount (PHP) *</span>
                      <input
                        required
                        inputMode="decimal"
                        placeholder="0.00"
                        value={row.gross_amount}
                        onChange={(e) => setInvoice(row.key, { gross_amount: e.target.value })}
                      />
                    </label>
                  )}
                  <div className="invoice-calc muted small">
                    {row.valid ? (
                      <>
                        VAT {formatMoney(row.vatAmount)} · Net sales {formatMoney(row.netOfVat)} · EWT{' '}
                        {formatMoney(row.ewtAmount)} · Total net <strong>{formatMoney(row.netAmount)}</strong>
                      </>
                    ) : (
                      'Enter gross amount'
                    )}
                  </div>
                  {perInvoiceUploads && (
                    <div className="invoice-upload">
                      <div className="field-label">Invoice file (image or PDF, max {MAX_MB} MB)</div>
                      <div
                        className={`dropzone ${dragOverKey === row.key ? 'over' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverKey(row.key);
                        }}
                        onDragLeave={() => setDragOverKey((k) => (k === row.key ? null : k))}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverKey(null);
                          addInvoiceFiles(row.key, e.dataTransfer.files);
                        }}
                      >
                        <p>Drop file here, or</p>
                        <input
                          type="file"
                          multiple
                          accept={ACCEPT}
                          onChange={(e) => {
                            addInvoiceFiles(row.key, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </div>
                      {(invoicePreviewMap[row.key]?.length ?? 0) > 0 && (
                        <div className="attachments">
                          {invoicePreviewMap[row.key].map((p, i) => (
                            <div key={`${row.key}-${i}`} className="attachment pending">
                              {p.url ? <img src={p.url} alt={p.file.name} /> : <span className="file-icon">PDF</span>}
                              <div className="small ellipsis">{p.file.name}</div>
                              <button
                                type="button"
                                className="btn small"
                                onClick={() =>
                                  setInvoiceFiles((prev) => ({
                                    ...prev,
                                    [row.key]: (prev[row.key] ?? []).filter((_, j) => j !== i),
                                  }))
                                }
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {isEdit && invoices.length > 1 && (
                    <button
                      type="button"
                      className="btn small danger"
                      onClick={() => {
                        setInvoices((rows) => rows.filter((r) => r.key !== row.key));
                        setInvoiceFiles((prev) => {
                          const next = { ...prev };
                          delete next[row.key];
                          return next;
                        });
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="invoice-totals">
            <span>
              Total gross: <strong>{formatMoney(totals.gross)}</strong>
            </span>
            <span>
              Total VAT: <strong>{formatMoney(totals.vat)}</strong>
            </span>
            <span>
              Total net sales: <strong>{formatMoney(totals.netSales)}</strong>
            </span>
            <span>
              Total EWT: <strong>{formatMoney(totals.ewt)}</strong>
            </span>
            <span>
              Total net: <strong>{formatMoney(totals.net)}</strong>
            </span>
          </div>

          {needsPdcSchedule && (
            <PdcSchedulePanel
              lines={pdcLines}
              onChange={setPdcLines}
              netAmount={payableNet}
              readOnly={!canEditDoc}
            />
          )}
        </div>

        <label className="field span-all">
          <span className="field-label">Description / notes</span>
          <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </label>

        {!perInvoiceUploads && (
          <div className="span-all">
            <div className="field-label">5. Attachments (image or PDF, max {MAX_MB} MB each)</div>
            <div
              className={`dropzone ${dragOverKey === 'shared' ? 'over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverKey('shared');
              }}
              onDragLeave={() => setDragOverKey((k) => (k === 'shared' ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverKey(null);
                addFiles(e.dataTransfer.files);
              }}
            >
              <p>Drag and drop files here, or</p>
              <input type="file" multiple accept={ACCEPT} onChange={(e) => addFiles(e.target.files)} />
            </div>

            {existing.data?.attachments?.length || previews.length ? (
              <div className="attachments">
                {existing.data?.attachments?.map((a) => (
                  <div key={a.id} className="attachment">
                    <a href={attachmentUrl(a.id)} target="_blank" rel="noreferrer">
                      {a.mime.startsWith('image/') ? (
                        <img src={attachmentUrl(a.id)} alt={a.original_name} />
                      ) : (
                        <span className="file-icon">PDF</span>
                      )}
                    </a>
                    <div className="small ellipsis">{a.original_name}</div>
                    <button
                      type="button"
                      className="btn small danger"
                      onClick={() =>
                        setConfirm({
                          title: 'Delete attachment',
                          message: `Delete ${a.original_name}? This cannot be undone.`,
                          onConfirm: () => removeAttachment.mutate(a.id),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {previews.map((p, i) => (
                  <div key={`new-${i}`} className="attachment pending">
                    {p.url ? <img src={p.url} alt={p.file.name} /> : <span className="file-icon">PDF</span>}
                    <div className="small ellipsis">{p.file.name} (new)</div>
                    <button type="button" className="btn small" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {perInvoiceUploads && (
          <p className="span-all hint">{ledger.uploadHint}</p>
        )}
        </div>

        <div className="span-all paper-form-actions w-full min-w-0">
          <ErrorBox error={error} />
          <div className="form-actions flex w-full min-w-0 flex-wrap gap-2">
            {canEditDoc ? (
              draftActions ? (
                <>
                  <button
                    type="button"
                    className="btn"
                    disabled={save.isPending}
                    onClick={() => {
                      setError(null);
                      save.mutate(true);
                    }}
                  >
                    {save.isPending ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button type="submit" className="btn primary" disabled={save.isPending}>
                    {save.isPending ? 'Saving...' : 'Save and submit'}
                  </button>
                </>
              ) : (
                <button type="submit" className="btn primary" disabled={save.isPending}>
                  {save.isPending
                    ? 'Saving...'
                    : isEdit
                      ? 'Save changes'
                      : splitSeparate && invoices.length > 1
                        ? `Create ${invoices.length} ${ledger.docs}`
                        : ledger.createLabel}
                </button>
              )
            ) : null}
            <Link to={ledger.listPath} className="btn ghost">
              {canEditDoc ? 'Cancel' : 'Back'}
            </Link>
          </div>
        </div>
      </form>
      <ConfirmDialog
        request={confirm}
        pending={removeAttachment.isPending}
        onClose={() => setConfirm(null)}
      />
    </section>
  );
}
