import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '../api';
import { ErrorBox, Modal } from '../components';
import { useAuth } from '../auth';

interface ArClient {
  id: number;
  name: string;
  tin: string | null;
  address: string | null;
  contact: string | null;
  default_trip_classification: 'FORWARD HAUL' | 'BACK HAUL' | null;
  active: boolean;
}

const empty = {
  name: '',
  tin: '',
  address: '',
  contact: '',
  default_trip_classification: '' as '' | 'FORWARD HAUL' | 'BACK HAUL',
  active: true,
};

export default function ArClientsPage() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);

  const list = useQuery({
    queryKey: ['ar-clients'],
    queryFn: () => api.get<{ items: ArClient[] }>('/ar/clients'),
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditId(null);
    setForm(empty);
    setError(null);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(empty);
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (c: ArClient) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      tin: c.tin ?? '',
      address: c.address ?? '',
      contact: c.contact ?? '',
      default_trip_classification: c.default_trip_classification ?? '',
      active: c.active,
    });
    setError(null);
    setFormOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name,
        tin: form.tin || null,
        address: form.address || null,
        contact: form.contact || null,
        default_trip_classification: form.default_trip_classification || null,
        active: form.active,
      };
      return editId ? api.put(`/ar/clients/${editId}`, body) : api.post('/ar/clients', body);
    },
    onSuccess: async () => {
      closeForm();
      await qc.invalidateQueries({ queryKey: ['ar-clients'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const canManage = auth.isAdmin || auth.can('ar_clients_manage') || auth.can('ar_edit');

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p className="muted">
            Receivable billed parties. Default trip classification can be overridden per summary.
          </p>
        </div>
        {canManage && (
          <div className="page-header-actions">
            <button type="button" className="btn primary" onClick={openCreate}>
              + Add client
            </button>
          </div>
        )}
      </div>
      <ErrorBox error={!formOpen ? error ?? (list.isError ? errorMessage(list.error) : null) : null} />

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>TIN</th>
                <th>Default classification</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(list.data?.items ?? []).map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.tin ?? '—'}</td>
                  <td>{c.default_trip_classification ?? '—'}</td>
                  <td>{c.active ? 'Yes' : 'No'}</td>
                  <td>
                    {canManage && (
                      <button type="button" className="btn ghost small" onClick={() => openEdit(c)}>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && canManage && (
        <Modal
          title={editId ? 'Edit client' : 'Add client'}
          onClose={save.isPending ? () => undefined : closeForm}
        >
          <form
            className="entry-sheet entry-sheet-modal"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <p className="muted">
              Billed party details for receivables. Trip classification can still be overridden per
              summary.
            </p>
            <div className="entry-sheet-grid">
              <label className="field">
                <span className="field-label">
                  Name <span className="req">*</span>
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Client / company name"
                />
              </label>
              <label className="field">
                <span className="field-label">TIN</span>
                <input
                  value={form.tin}
                  onChange={(e) => setForm({ ...form, tin: e.target.value })}
                  placeholder="Optional"
                />
              </label>
              <label className="field">
                <span className="field-label">Contact</span>
                <input
                  value={form.contact}
                  onChange={(e) => setForm({ ...form, contact: e.target.value })}
                  placeholder="Phone or person"
                />
              </label>
              <label className="field span-all">
                <span className="field-label">Address</span>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Billing address"
                />
              </label>
              <label className="field span-2">
                <span className="field-label">Default trip classification</span>
                <select
                  value={form.default_trip_classification}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      default_trip_classification: e.target.value as typeof form.default_trip_classification,
                    })
                  }
                >
                  <option value="">None</option>
                  <option value="FORWARD HAUL">FORWARD HAUL</option>
                  <option value="BACK HAUL">BACK HAUL</option>
                </select>
              </label>
              <label className="checkbox field">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active
              </label>
            </div>
            <ErrorBox error={error} />
            <div className="entry-sheet-actions">
              <button type="submit" className="btn primary" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : editId ? 'Save changes' : 'Add client'}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={closeForm}
                disabled={save.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
