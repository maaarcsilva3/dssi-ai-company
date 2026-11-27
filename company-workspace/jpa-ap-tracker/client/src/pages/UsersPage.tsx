import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  errorMessage,
  PERMISSION_LABELS,
  type AppUser,
  type PayableStatus,
  type PermissionKey,
  type Permissions,
  type UserRole,
} from '../api';
import { ConfirmDialog, ErrorBox, Modal, type ConfirmRequest } from '../components';

const PERM_KEYS = Object.keys(PERMISSION_LABELS) as PermissionKey[];

const EMPTY_PERMS = Object.fromEntries(PERM_KEYS.map((k) => [k, false])) as Permissions;

const PERMISSION_SECTIONS: { title: string; keys: PermissionKey[] }[] = [
  {
    title: 'Payables',
    keys: [
      'payables_view',
      'payables_create',
      'payables_edit',
      'payables_delete',
      'payables_status',
      'payables_status_history',
      'upcoming_release',
      'suppliers',
    ],
  },
  {
    title: 'Accounts receivable (billing)',
    keys: ['ar_view', 'ar_edit', 'ar_clients_manage'],
  },
  {
    title: 'Funds & liquidations',
    keys: [
      'source_accounts',
      'liquidations_view',
      'liquidations_manage',
      'petty_cash_view',
      'petty_cash_manage',
    ],
  },
  {
    title: 'System',
    keys: ['masterdata', 'settings'],
  },
];

const LEGACY_PERMISSION_SECTION: { title: string; keys: PermissionKey[] } = {
  title: 'Receivables (legacy)',
  keys: [
    'receivables_view',
    'receivables_create',
    'receivables_edit',
    'receivables_delete',
    'receivables_status',
    'upcoming_collection',
  ],
};

interface FormState {
  id?: number;
  username: string;
  display_name: string;
  password: string;
  role: UserRole;
  active: boolean;
  permissions: Permissions;
  /** Statuses that auto-assign this user when a payable enters them. */
  payable_default_status_ids: number[];
}

const EMPTY: FormState = {
  username: '',
  display_name: '',
  password: '',
  role: 'staff',
  active: true,
  permissions: { ...EMPTY_PERMS },
  payable_default_status_ids: [],
};

function fromUser(u: AppUser): FormState {
  return {
    id: u.id,
    username: u.username,
    display_name: u.display_name,
    password: '',
    role: u.role,
    active: u.active,
    permissions: { ...EMPTY_PERMS, ...u.permissions },
    payable_default_status_ids: u.payable_default_status_ids ?? [],
  };
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [showLegacyPermissions, setShowLegacyPermissions] = useState(false);
  const editing = form.id != null;

  const list = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<AppUser[]>('/users'),
  });

  const statuses = useQuery({
    queryKey: ['statuses'],
    queryFn: () => api.get<PayableStatus[]>('/statuses'),
  });

  const closeForm = () => {
    setFormOpen(false);
    setForm(EMPTY);
    setError(null);
    setShowLegacyPermissions(false);
  };

  const openCreate = () => {
    setForm(EMPTY);
    setError(null);
    setShowLegacyPermissions(false);
    setFormOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setForm(fromUser(u));
    setError(null);
    setShowLegacyPermissions(false);
    setFormOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        username: form.username.trim(),
        display_name: form.display_name.trim(),
        role: form.role,
        active: form.active,
        permissions: form.role === 'staff' ? form.permissions : undefined,
        /** Cleared: status changes follow the sequential workflow, not a per-user matrix. */
        payable_status_ids: [],
        payable_default_status_ids:
          form.role === 'staff' ? form.payable_default_status_ids : [],
        ...(form.password ? { password: form.password } : {}),
      };
      if (editing) {
        if (!form.password) delete (body as { password?: string }).password;
        return api.put<AppUser>(`/users/${form.id}`, body);
      }
      if (!form.password) throw new Error('Password is required for new users');
      return api.post<AppUser>('/users', { ...body, password: form.password });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['assignees'] });
      closeForm();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/users/${id}`),
    onSuccess: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['assignees'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    save.mutate();
  };

  const title = useMemo(
    () => (editing ? `Edit ${form.display_name || form.username}` : 'New user'),
    [editing, form],
  );

  /** status_id → staff users bound as default (workflow steps: one; anytime/sort_order 0: many) */
  const defaultStatusOwners = useMemo(() => {
    const map = new Map<number, { id: number; name: string }[]>();
    for (const u of list.data ?? []) {
      if (u.role !== 'staff') continue;
      for (const statusId of u.payable_default_status_ids ?? []) {
        const listForStatus = map.get(statusId) ?? [];
        listForStatus.push({ id: u.id, name: u.display_name || u.username });
        map.set(statusId, listForStatus);
      }
    }
    return map;
  }, [list.data]);

  const statusNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of statuses.data ?? []) map.set(s.id, s.name);
    return map;
  }, [statuses.data]);

  return (
    <section>
      <div className="page-header">
        <h1>Users</h1>
        <div className="page-header-actions">
          <button type="button" className="btn primary" onClick={openCreate}>
            + New user
          </button>
        </div>
      </div>

      <div className="card table-wrap">
        <ErrorBox error={list.error ? errorMessage(list.error) : null} />
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Default statuses</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && (
              <tr>
                <td colSpan={6}>Loading...</td>
              </tr>
            )}
            {list.data?.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'inactive'}>
                <td>{u.display_name}</td>
                <td>{u.username}</td>
                <td>{u.role}</td>
                <td className="muted small">
                  {u.role === 'staff' && (u.payable_default_status_ids ?? []).length
                    ? (u.payable_default_status_ids ?? [])
                        .map((id) => statusNameById.get(id) ?? `#${id}`)
                        .join(', ')
                    : '—'}
                </td>
                <td>{u.active ? 'Yes' : 'No'}</td>
                <td className="actions">
                  <button type="button" className="btn small" onClick={() => openEdit(u)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn small danger"
                    onClick={() =>
                      setConfirm({
                        title: 'Delete user',
                        message: `Delete user ${u.username} (${u.display_name})? This cannot be undone.`,
                        onConfirm: () => remove.mutate(u.id),
                      })
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        request={confirm}
        pending={remove.isPending}
        onClose={() => setConfirm(null)}
      />

      {formOpen && (
        <Modal title={title} onClose={save.isPending ? () => undefined : closeForm}>
          <form className="form-grid paper-form" onSubmit={onSubmit}>
            <label>
              Username *
              <input
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </label>
            <label>
              Display name *
              <input
                required
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </label>
            <label>
              Role
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>
              Password {editing ? '(leave blank to keep)' : '*'}
              <input
                type="password"
                required={!editing}
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Active
            </label>

            {form.role === 'staff' && (
              <fieldset className="span-all permissions-fieldset">
                <legend>Permissions</legend>
                <div className="permission-suboptions span-all" style={{ marginBottom: '1rem' }}>
                  <h4 className="form-section-title">Default payable statuses</h4>
                  <p className="muted small">
                    When a payable enters a workflow status (sort order &gt; 0), it is assigned to that
                    status&apos;s one default user. Anytime statuses (sort order 0, e.g. Rejected /
                    Cancelled) can be bound to multiple users.
                  </p>
                  {statuses.isLoading && <div className="muted small">Loading statuses...</div>}
                  <ErrorBox error={statuses.error ? errorMessage(statuses.error) : null} />
                  <div className="permissions-grid default-status-grid">
                    {statuses.data
                      ?.filter((status) => status.active)
                      .map((status) => {
                        const owners = defaultStatusOwners.get(status.id) ?? [];
                        const isAnytime = status.sort_order === 0;
                        const otherOwners = owners.filter((o) => o.id !== form.id);
                        const takenByOther = !isAnytime && otherOwners.length > 0;
                        const checked = form.payable_default_status_ids.includes(status.id);
                        const othersLabel = otherOwners.map((o) => o.name).join(', ');
                        return (
                          <label
                            key={`default-${status.id}`}
                            className={`checkbox default-status-option${takenByOther ? ' is-taken' : ''}`}
                            title={
                              takenByOther
                                ? `Already assigned to ${othersLabel}`
                                : isAnytime && otherOwners.length
                                  ? `Also bound to ${othersLabel}`
                                  : checked
                                    ? `Assigned to ${form.display_name || 'this user'}`
                                    : undefined
                            }
                          >
                            <input
                              type="checkbox"
                              disabled={takenByOther}
                              checked={checked && !takenByOther}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  payable_default_status_ids: e.target.checked
                                    ? [...f.payable_default_status_ids, status.id]
                                    : f.payable_default_status_ids.filter((id) => id !== status.id),
                                }))
                              }
                            />
                            <span className="default-status-option-text">
                              <span>
                                {status.name}
                                {isAnytime ? (
                                  <span className="muted small"> · anytime</span>
                                ) : null}
                              </span>
                              {takenByOther ? (
                                <span className="muted small">Assigned to {othersLabel}</span>
                              ) : checked ? (
                                <span className="muted small">
                                  {isAnytime && otherOwners.length
                                    ? `You + ${othersLabel}`
                                    : `Assigned to ${form.display_name || 'this user'}`}
                                </span>
                              ) : isAnytime && otherOwners.length ? (
                                <span className="muted small">Also bound to {othersLabel}</span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
                <div className="permissions-sections">
                  {[
                    ...PERMISSION_SECTIONS,
                    ...(showLegacyPermissions ? [LEGACY_PERMISSION_SECTION] : []),
                  ].map((section) => (
                    <div key={section.title} className="permissions-section">
                      <h3 className="permissions-section-title">{section.title}</h3>
                      <div className="permissions-list">
                        {section.keys.map((key) => (
                          <div key={key} className="permission-block">
                            <label className="checkbox">
                              <input
                                type="checkbox"
                                checked={form.permissions[key]}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setForm((f) => ({
                                    ...f,
                                    permissions: { ...f.permissions, [key]: checked },
                                  }));
                                }}
                              />
                              {PERMISSION_LABELS[key]}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => setShowLegacyPermissions((v) => !v)}
                  >
                    {showLegacyPermissions ? 'Hide legacy permissions' : 'Show legacy permissions'}
                  </button>
                </div>
              </fieldset>
            )}

            <div className="span-all">
              <ErrorBox error={error} />
              <div className="form-actions">
                <button type="submit" className="btn primary" disabled={save.isPending}>
                  {save.isPending ? 'Saving...' : editing ? 'Save user' : 'Create user'}
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
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
