import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  CATEGORY_LABELS,
  errorMessage,
  type PayableStatusCustomField,
  type StatusCategory,
} from '../api';
import { ConfirmDialog, ErrorBox, Modal, type ConfirmRequest } from '../components';
import { usePaymentTerms } from '../hooks';

type CustomFieldDraft = {
  key: string;
  id?: number;
  label: string;
  field_type: 'text' | 'date';
  show_in_list: boolean;
  sort_order: number;
};

function toCustomFieldDrafts(fields: PayableStatusCustomField[] | undefined): CustomFieldDraft[] {
  return (fields ?? []).map((f, i) => ({
    key: `cf-${f.id}`,
    id: f.id,
    label: f.label,
    field_type: f.field_type,
    show_in_list: f.show_in_list,
    sort_order: f.sort_order ?? i,
  }));
}

interface Field {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'term' | 'category' | 'color' | 'select';
  required?: boolean;
  defaultValue?: unknown;
  hint?: string;
  options?: { value: string; label: string }[];
}

interface Entity {
  key: string;
  label: string;
  endpoint: string;
  fields: Field[];
  categoryLabels?: Record<StatusCategory, string>;
}

/** Payable suppliers (clients table). Managed under Payables → Suppliers. */
export const SUPPLIERS_ENTITY: Entity = {
  key: 'clients',
  label: 'Suppliers',
  endpoint: '/clients',
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'payment_term_id', label: 'Payment terms', type: 'term' },
    { key: 'tin', label: 'TIN', type: 'text' },
    { key: 'contact', label: 'Contact', type: 'text' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'bank_details', label: 'Bank details', type: 'textarea' },
  ],
};

const ENTITIES: Entity[] = [
  {
    key: 'payment-types',
    label: 'Payment types',
    endpoint: '/payment-types',
    fields: [{ key: 'name', label: 'Name', type: 'text', required: true }],
  },
  {
    key: 'payment-methods',
    label: 'Payment formats',
    endpoint: '/payment-methods',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'requires_reference', label: 'Requires reference (check no. / txn ref)', type: 'checkbox' },
    ],
  },
  {
    key: 'payment-terms',
    label: 'Payment terms',
    endpoint: '/payment-terms',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'days', label: 'Days', type: 'number', required: true },
    ],
  },
  {
    key: 'statuses',
    label: 'Payable statuses',
    endpoint: '/statuses',
    categoryLabels: CATEGORY_LABELS,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      {
        key: 'category',
        label: 'Category',
        type: 'category',
        required: true,
        defaultValue: 'open',
        hint: 'Open = still to be released. Paid = released (needs paid date / reference). Cancelled = excluded.',
      },
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#6b7280' },
      {
        key: 'sort_order',
        label: 'Sort order',
        type: 'number',
        defaultValue: 10,
        hint:
          'Lower numbers are earlier steps. Same sort order = sibling choices at that step. Sort order 0 = anytime (e.g. Reject) — choosable from any step.',
      },
      {
        key: 'require_file',
        label: 'Require file upload before setting this status',
        type: 'checkbox',
        defaultValue: false,
      },
    ],
  },
  {
    key: 'receivable-statuses',
    label: 'Receivable statuses',
    endpoint: '/receivable-statuses',
    categoryLabels: {
      open: 'Outstanding (to be collected)',
      paid: 'Collected',
      cancelled: 'Cancelled',
    },
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      {
        key: 'category',
        label: 'Category',
        type: 'category',
        required: true,
        defaultValue: 'open',
        hint: 'Open = still to collect. Paid = collected (needs collected date / reference). Cancelled = excluded.',
      },
      { key: 'color', label: 'Color', type: 'color', defaultValue: '#6b7280' },
      { key: 'sort_order', label: 'Sort order', type: 'number', defaultValue: 0, hint: 'Lower numbers show first in dropdowns' },
    ],
  },
  {
    key: 'ar-deduction-descriptions',
    label: 'AR deduction descriptions',
    endpoint: '/ar-deduction-descriptions',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      {
        key: 'sort_order',
        label: 'Sort order',
        type: 'number',
        defaultValue: 0,
        hint: 'Lower numbers show first in the AR summary deduction dropdown',
      },
    ],
  },
];

type Row = Record<string, unknown> & { id: number; active: boolean };

export default function MasterdataPage() {
  const [active, setActive] = useState(ENTITIES[0].key);
  const entity = ENTITIES.find((e) => e.key === active)!;
  return (
    <section>
      <div className="page-header">
        <h1>Masterdata</h1>
      </div>
      <div className="subtabs">
        {ENTITIES.map((e) => (
          <button key={e.key} className={`tab ${e.key === active ? 'active' : ''}`} onClick={() => setActive(e.key)}>
            {e.label}
          </button>
        ))}
      </div>
      <EntityManager key={entity.key} entity={entity} />
    </section>
  );
}

function emptyValues(entity: Entity): Record<string, unknown> {
  return Object.fromEntries(entity.fields.map((f) => [f.key, f.defaultValue ?? (f.type === 'checkbox' ? false : '')]));
}

export function EntityManager({ entity }: { entity: Entity }) {
  const qc = useQueryClient();
  const terms = usePaymentTerms(true);
  const termLabel = (id: unknown) => {
    const t = terms.data?.find((x) => x.id === id);
    return t ? `${t.name} (${t.days} days)` : '';
  };
  const renderCell = (f: Field, value: unknown) => {
    switch (f.type) {
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'term':
        return termLabel(value);
      case 'category':
        return (entity.categoryLabels ?? CATEGORY_LABELS)[value as StatusCategory] ?? String(value ?? '');
      case 'color':
        return (
          <>
            <span className="swatch" style={{ background: String(value) }} />
            {String(value ?? '')}
          </>
        );
      default:
        return String(value ?? '');
    }
  };
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(emptyValues(entity));
  const [customFields, setCustomFields] = useState<CustomFieldDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const isPayableStatuses = entity.key === 'statuses';

  const list = useQuery({
    queryKey: [entity.key, true],
    queryFn: () => api.get<Row[]>(`${entity.endpoint}?includeInactive=true`),
  });
  const rows = (list.data ?? []).filter((r) => showInactive || r.active);

  const invalidate = () => qc.invalidateQueries({ queryKey: [entity.key] });

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setValues(emptyValues(entity));
    setCustomFields([]);
    setError(null);
  };

  const openCreate = () => {
    setError(null);
    setEditing(null);
    setValues(emptyValues(entity));
    setCustomFields([]);
    setFormOpen(true);
  };

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing ? api.put(`${entity.endpoint}/${editing.id}`, body) : api.post(entity.endpoint, body),
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.del<{ deleted: boolean; deactivated: boolean }>(`${entity.endpoint}/${id}`),
    onSuccess: (res) => {
      setConfirm(null);
      invalidate();
      if (res.deactivated) setError('Record is in use, so it was deactivated instead of deleted.');
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const setActiveFlag = useMutation({
    mutationFn: (row: Row) => {
      const body = Object.fromEntries(entity.fields.map((f) => [f.key, row[f.key]]));
      if (isPayableStatuses) {
        body.custom_fields = toCustomFieldDrafts(
          row.custom_fields as PayableStatusCustomField[] | undefined,
        ).map(({ id, label, field_type, show_in_list, sort_order }) => ({
          ...(id != null ? { id } : {}),
          label,
          field_type,
          show_in_list,
          sort_order,
        }));
      }
      return api.put(`${entity.endpoint}/${row.id}`, { ...body, active: !row.active });
    },
    onSuccess: invalidate,
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const body: Record<string, unknown> = { ...values, active: editing ? editing.active : true };
    for (const f of entity.fields) {
      if (f.type === 'select' && (body[f.key] === '' || body[f.key] == null)) {
        body[f.key] = null;
      }
    }
    if (isPayableStatuses) {
      for (const field of customFields) {
        if (!field.label.trim()) {
          setError('Each custom field needs a label.');
          return;
        }
      }
      body.custom_fields = customFields.map(({ id, label, field_type, show_in_list, sort_order }, i) => ({
        ...(id != null ? { id } : {}),
        label: label.trim(),
        field_type,
        show_in_list,
        sort_order: sort_order ?? i,
      }));
    }
    save.mutate(body);
  };

  const startEdit = (row: Row) => {
    setError(null);
    setEditing(row);
    setValues(Object.fromEntries(entity.fields.map((f) => [f.key, row[f.key] ?? (f.type === 'checkbox' ? false : '')])));
    if (isPayableStatuses) {
      setCustomFields(toCustomFieldDrafts(row.custom_fields as PayableStatusCustomField[] | undefined));
    } else {
      setCustomFields([]);
    }
    setFormOpen(true);
  };

  const formTitle = editing
    ? `Edit ${entity.label.toLowerCase()} #${editing.id}`
    : `Add ${entity.label.toLowerCase()}`;

  return (
    <div className="masterdata">
      <ErrorBox error={list.error ? errorMessage(list.error) : !formOpen ? error : null} />

      <div className="card table-wrap">
        <div className="table-toolbar">
          <label className="checkbox">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
          <button type="button" className="btn primary" onClick={openCreate}>
            Add {entity.label.toLowerCase()}
          </button>
        </div>
        <table>
          <thead>
            <tr>
              {entity.fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              {isPayableStatuses && <th>Custom fields</th>}
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.active ? '' : 'inactive'}>
                {entity.fields.map((f) => (
                  <td key={f.key}>{renderCell(f, r[f.key])}</td>
                ))}
                {isPayableStatuses && (
                  <td>
                    {((r.custom_fields as PayableStatusCustomField[] | undefined) ?? [])
                      .map((f) => f.label)
                      .join(', ') || <span className="muted">—</span>}
                  </td>
                )}
                <td>{r.active ? 'Yes' : 'No'}</td>
                <td className="actions">
                  <button className="btn small" onClick={() => startEdit(r)}>
                    Edit
                  </button>
                  <button className="btn small" onClick={() => setActiveFlag.mutate(r)}>
                    {r.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="btn small danger"
                    onClick={() =>
                      setConfirm({
                        title: `Delete ${entity.label.toLowerCase()}`,
                        message: `Delete "${String(r.name)}"? This cannot be undone if the record is unused.`,
                        onConfirm: () => remove.mutate(r.id),
                      })
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={entity.fields.length + (isPayableStatuses ? 3 : 2)} className="muted">
                  No records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        request={confirm}
        pending={remove.isPending}
        onClose={() => setConfirm(null)}
      />

      {formOpen && (
        <Modal title={formTitle} onClose={save.isPending ? () => undefined : closeForm}>
          <form className="form-grid paper-form" onSubmit={onSubmit}>
            {entity.fields.map((f) =>
              f.type === 'checkbox' ? (
                <label key={f.key} className="checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(values[f.key])}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.checked }))}
                  />
                  {f.label}
                </label>
              ) : f.type === 'term' ? (
                <label key={f.key}>
                  {f.label}
                  <select
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  >
                    <option value="">None (enter due dates manually)</option>
                    {terms.data
                      ?.filter((t) => t.active || String(t.id) === String(values[f.key]))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.days} days)
                        </option>
                      ))}
                  </select>
                </label>
              ) : f.type === 'category' ? (
                <label key={f.key}>
                  {f.label} *
                  <select
                    required
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  >
                    {(Object.keys(entity.categoryLabels ?? CATEGORY_LABELS) as StatusCategory[]).map(
                      (c) => (
                        <option key={c} value={c}>
                          {(entity.categoryLabels ?? CATEGORY_LABELS)[c]}
                        </option>
                      ),
                    )}
                  </select>
                  {f.hint && <span className="hint">{f.hint}</span>}
                </label>
              ) : f.type === 'select' ? (
                <label key={f.key}>
                  {f.label}
                  <select
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  >
                    {(f.options ?? []).map((o) => (
                      <option key={o.value || 'none'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {f.hint && <span className="hint">{f.hint}</span>}
                </label>
              ) : f.type === 'textarea' ? (
                <label key={f.key}>
                  {f.label}
                  <textarea
                    rows={2}
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                </label>
              ) : (
                <label key={f.key}>
                  {f.label}
                  {f.required ? ' *' : ''}
                  <input
                    type={f.type}
                    min={f.type === 'number' ? 0 : undefined}
                    required={f.required}
                    value={String(values[f.key] ?? '')}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                  {f.hint && <span className="hint">{f.hint}</span>}
                </label>
              ),
            )}
            {isPayableStatuses && (
              <div className="span-all">
                <h3 className="form-section-title">Custom fields</h3>
                <p className="muted small">
                  Required when changing a payable to this status. You can add more than one.
                </p>
                {customFields.map((field, index) => (
                  <div key={field.key} className="form-grid" style={{ marginBottom: '0.75rem' }}>
                    <label>
                      Label *
                      <input
                        required
                        value={field.label}
                        onChange={(e) =>
                          setCustomFields((rows) =>
                            rows.map((r, i) => (i === index ? { ...r, label: e.target.value } : r)),
                          )
                        }
                      />
                    </label>
                    <label>
                      Type
                      <select
                        value={field.field_type}
                        onChange={(e) =>
                          setCustomFields((rows) =>
                            rows.map((r, i) =>
                              i === index
                                ? { ...r, field_type: e.target.value as 'text' | 'date' }
                                : r,
                            ),
                          )
                        }
                      >
                        <option value="text">Text</option>
                        <option value="date">Date</option>
                      </select>
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={field.show_in_list}
                        onChange={(e) =>
                          setCustomFields((rows) =>
                            rows.map((r, i) =>
                              i === index ? { ...r, show_in_list: e.target.checked } : r,
                            ),
                          )
                        }
                      />
                      Show in Payables columns
                    </label>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => setCustomFields((rows) => rows.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() =>
                    setCustomFields((rows) => [
                      ...rows,
                      {
                        key: `new-${Date.now()}-${rows.length}`,
                        label: '',
                        field_type: 'text',
                        show_in_list: false,
                        sort_order: rows.length,
                      },
                    ])
                  }
                >
                  Add custom field
                </button>
              </div>
            )}
            <ErrorBox error={error} />
            <div className="span-all form-actions">
              <button type="submit" className="btn primary" disabled={save.isPending}>
                {editing ? 'Save' : 'Add'}
              </button>
              <button type="button" className="btn ghost" onClick={closeForm} disabled={save.isPending}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
