import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  errorMessage,
  SOURCE_TXN_STATUSES,
  type SourceAccount,
  type SourceAccountTransaction,
  type SourceTxnStatus,
} from '../api';
import { useAuth } from '../auth';
import { ConfirmDialog, ErrorBox, Modal, type ConfirmRequest } from '../components';
import { useSourceAccounts, useSourceTransactions } from '../hooks';
import { formatAmountOnBlur, formatDate, formatMoney } from '../format';

export type SourceAccountsMode = 'accounts' | 'deposit' | 'withdrawal';

/** REVERSED is only for undoing an existing posted line, not for new rows. */
const CREATE_TXN_STATUSES = SOURCE_TXN_STATUSES.filter((s) => s !== 'REVERSED');

const emptyAccountForm = {
  bank_name: '',
  account_number: '',
  active: true,
  initial_deposit: '',
  initial_deposit_date: '',
  initial_deposit_remarks: 'Initial funds',
};

export default function SourceAccountsPage({ mode }: { mode: SourceAccountsMode }) {
  const auth = useAuth();
  const canManageAccounts = auth.isAdmin;
  const qc = useQueryClient();
  const [filterAccountId, setFilterAccountId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [txnFormOpen, setTxnFormOpen] = useState(false);
  const [transferFormOpen, setTransferFormOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const [accountForm, setAccountForm] = useState(emptyAccountForm);

  const [txnForm, setTxnForm] = useState({
    source_account_id: '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    status: 'POSTED' as SourceTxnStatus,
    remarks: '',
  });

  const [transferForm, setTransferForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    status: 'POSTED' as SourceTxnStatus,
    remarks: '',
  });

  const accounts = useSourceAccounts(true);
  const txns = useSourceTransactions(filterAccountId, true);

  const activeAccounts = useMemo(() => accounts.data?.filter((a) => a.active) ?? [], [accounts.data]);

  const filteredTxns = useMemo(() => {
    const rows = txns.data ?? [];
    if (mode === 'deposit') return rows.filter((t) => Number(t.deposit_amount) > 0);
    if (mode === 'withdrawal') return rows.filter((t) => Number(t.withdraw_amount) > 0);
    return rows;
  }, [txns.data, mode]);

  useEffect(() => {
    setError(null);
    setMessage(null);
    setEditingId(null);
    setAccountFormOpen(false);
    setTxnFormOpen(false);
    setTransferFormOpen(false);
    setAccountForm(emptyAccountForm);
    setTxnForm((f) => ({
      ...f,
      amount: '',
      remarks: '',
      transaction_date: new Date().toISOString().slice(0, 10),
    }));
  }, [mode]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['source-accounts'] });
    qc.invalidateQueries({ queryKey: ['source-transactions'] });
  };

  const createAccount = useMutation({
    mutationFn: () =>
      api.post<SourceAccount>('/source-accounts', {
        bank_name: accountForm.bank_name.trim(),
        account_number: accountForm.account_number.trim(),
        active: true,
        ...(accountForm.initial_deposit
          ? {
              initial_deposit: accountForm.initial_deposit.replace(/,/g, ''),
              initial_deposit_date: accountForm.initial_deposit_date || undefined,
              initial_deposit_remarks: accountForm.initial_deposit_remarks || 'Initial funds',
            }
          : {}),
      }),
    onSuccess: (row) => {
      setMessage(`Created ${row.bank_name} · ${row.account_number}`);
      setAccountFormOpen(false);
      setAccountForm(emptyAccountForm);
      setEditingId(null);
      setError(null);
      invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const updateAccount = useMutation({
    mutationFn: () =>
      api.put<SourceAccount>(`/source-accounts/${editingId}`, {
        bank_name: accountForm.bank_name.trim(),
        account_number: accountForm.account_number.trim(),
        active: accountForm.active,
      }),
    onSuccess: (row) => {
      setMessage(`Updated ${row.bank_name} · ${row.account_number}`);
      setAccountFormOpen(false);
      setEditingId(null);
      setAccountForm(emptyAccountForm);
      setError(null);
      invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => api.del(`/source-accounts/${id}`),
    onSuccess: () => {
      setConfirm(null);
      setMessage('Account removed or deactivated');
      if (editingId) {
        setAccountFormOpen(false);
        setEditingId(null);
        setAccountForm(emptyAccountForm);
      }
      invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const createTxn = useMutation({
    mutationFn: () => {
      const amount = txnForm.amount.replace(/,/g, '');
      const isDeposit = mode === 'deposit';
      return api.post<SourceAccountTransaction>('/source-accounts/transactions', {
        source_account_id: Number(txnForm.source_account_id),
        ...(isDeposit ? { deposit_amount: amount } : { withdraw_amount: amount }),
        transaction_date: txnForm.transaction_date,
        status: txnForm.status,
        remarks: txnForm.remarks || null,
      });
    },
    onSuccess: () => {
      setMessage(mode === 'deposit' ? 'Deposit saved' : 'Withdrawal saved');
      setTxnFormOpen(false);
      setTxnForm((f) => ({ ...f, amount: '', remarks: '' }));
      setError(null);
      invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const transfer = useMutation({
    mutationFn: () =>
      api.post('/source-accounts/transfer', {
        from_account_id: Number(transferForm.from_account_id),
        to_account_id: Number(transferForm.to_account_id),
        amount: transferForm.amount.replace(/,/g, ''),
        transaction_date: transferForm.transaction_date,
        status: transferForm.status,
        remarks: transferForm.remarks || null,
      }),
    onSuccess: () => {
      setMessage('Transfer posted');
      setTransferFormOpen(false);
      setTransferForm((f) => ({ ...f, amount: '', remarks: '' }));
      setError(null);
      invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const patchTxn = useMutation({
    mutationFn: ({ id, status }: { id: number; status: SourceTxnStatus }) =>
      api.patch<SourceAccountTransaction>(`/source-accounts/transactions/${id}`, { status }),
    onSuccess: () => {
      setMessage('Transaction status updated');
      invalidate();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const closeAccountForm = () => {
    setAccountFormOpen(false);
    setEditingId(null);
    setAccountForm(emptyAccountForm);
  };

  const startEdit = (a: SourceAccount) => {
    setEditingId(a.id);
    setAccountForm({
      bank_name: a.bank_name,
      account_number: a.account_number,
      active: a.active,
      initial_deposit: '',
      initial_deposit_date: '',
      initial_deposit_remarks: 'Initial funds',
    });
    setError(null);
    setMessage(null);
    setAccountFormOpen(true);
  };

  const openCreateAccount = () => {
    setEditingId(null);
    setAccountForm(emptyAccountForm);
    setError(null);
    setMessage(null);
    setAccountFormOpen(true);
  };

  const accountBusy = createAccount.isPending || updateAccount.isPending;
  const title =
    mode === 'accounts' ? 'Source accounts' : mode === 'deposit' ? 'Deposit' : 'Withdrawal';

  return (
    <section>
      <div className="page-header">
        <div className="min-w-0">
          <h1>{title}</h1>
          {mode === 'accounts' && (
            <p className="muted">Bank accounts used for payable releases and fund movements.</p>
          )}
          {mode === 'deposit' && <p className="muted">Record deposits into a source account.</p>}
          {mode === 'withdrawal' && <p className="muted">Record withdrawals from a source account.</p>}
        </div>
        <div className="page-header-actions">
          {mode === 'accounts' && canManageAccounts && (
            <>
              <button type="button" className="btn primary" onClick={openCreateAccount}>
                + New account
              </button>
              {activeAccounts.length >= 2 && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setError(null);
                    setMessage(null);
                    setTransferFormOpen(true);
                  }}
                >
                  Transfer
                </button>
              )}
            </>
          )}
          {(mode === 'deposit' || mode === 'withdrawal') && (
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setError(null);
                setMessage(null);
                setTxnFormOpen(true);
              }}
            >
              {mode === 'deposit' ? '+ Add deposit' : '+ Add withdrawal'}
            </button>
          )}
        </div>
      </div>

      <ErrorBox error={error} />
      {message && <p className="ok">{message}</p>}
      <ConfirmDialog
        request={confirm}
        pending={deactivate.isPending}
        onClose={() => setConfirm(null)}
      />

      {mode === 'accounts' && (
        <>
          {!canManageAccounts && (
            <p className="muted">Only admins can create or edit source accounts.</p>
          )}

          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Account number</th>
                  <th className="num">Available balance</th>
                  <th>Status</th>
                  {canManageAccounts && <th></th>}
                </tr>
              </thead>
              <tbody>
                {accounts.isLoading && (
                  <tr>
                    <td colSpan={canManageAccounts ? 5 : 4}>Loading...</td>
                  </tr>
                )}
                {accounts.data?.length === 0 && (
                  <tr>
                    <td colSpan={canManageAccounts ? 5 : 4} className="muted">
                      No source accounts yet.
                    </td>
                  </tr>
                )}
                {accounts.data?.map((a) => (
                  <tr key={a.id} className={a.active ? '' : 'muted'}>
                    <td>{a.bank_name}</td>
                    <td>{a.account_number}</td>
                    <td className="num">{formatMoney(a.available_balance ?? '0')}</td>
                    <td>{a.active ? 'Active' : 'Inactive'}</td>
                    {canManageAccounts && (
                      <td className="actions">
                        <button type="button" className="btn small" onClick={() => startEdit(a)}>
                          Edit
                        </button>
                        {a.active && (
                          <button
                            type="button"
                            className="btn small danger"
                            onClick={() =>
                              setConfirm({
                                title: 'Deactivate account',
                                message: `Deactivate ${a.bank_name} · ${a.account_number}?`,
                                confirmLabel: 'Deactivate',
                                onConfirm: () => deactivate.mutate(a.id),
                              })
                            }
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {accountFormOpen && canManageAccounts && (
            <Modal
              title={editingId ? `Edit account #${editingId}` : 'New source account'}
              onClose={accountBusy ? () => undefined : closeAccountForm}
            >
              <form
                className="form-grid paper-form"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  setError(null);
                  setMessage(null);
                  if (editingId) updateAccount.mutate();
                  else createAccount.mutate();
                }}
              >
                <label>
                  Bank name *
                  <input
                    required
                    value={accountForm.bank_name}
                    onChange={(e) => setAccountForm((f) => ({ ...f, bank_name: e.target.value }))}
                  />
                </label>
                <label>
                  Account number *
                  <input
                    required
                    value={accountForm.account_number}
                    onChange={(e) =>
                      setAccountForm((f) => ({ ...f, account_number: e.target.value }))
                    }
                  />
                </label>
                {editingId ? (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={accountForm.active}
                      onChange={(e) => setAccountForm((f) => ({ ...f, active: e.target.checked }))}
                    />
                    Active
                  </label>
                ) : (
                  <>
                    <label>
                      Initial deposit (optional)
                      <input
                        inputMode="decimal"
                        placeholder="0.00"
                        value={accountForm.initial_deposit}
                        onChange={(e) =>
                          setAccountForm((f) => ({ ...f, initial_deposit: e.target.value }))
                        }
                        onBlur={(e) => {
                          const next = formatAmountOnBlur(e.target.value);
                          if (next !== accountForm.initial_deposit) {
                            setAccountForm((f) => ({ ...f, initial_deposit: next }));
                          }
                        }}
                      />
                    </label>
                    <label>
                      Deposit date
                      <input
                        type="date"
                        value={accountForm.initial_deposit_date}
                        onChange={(e) =>
                          setAccountForm((f) => ({ ...f, initial_deposit_date: e.target.value }))
                        }
                      />
                    </label>
                    <label className="span-all">
                      Deposit remarks
                      <input
                        value={accountForm.initial_deposit_remarks}
                        onChange={(e) =>
                          setAccountForm((f) => ({
                            ...f,
                            initial_deposit_remarks: e.target.value,
                          }))
                        }
                      />
                    </label>
                  </>
                )}
                <div className="span-all form-actions">
                  <button type="submit" className="btn primary" disabled={accountBusy}>
                    {editingId
                      ? updateAccount.isPending
                        ? 'Saving…'
                        : 'Save changes'
                      : createAccount.isPending
                        ? 'Saving…'
                        : 'Create account'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={closeAccountForm}
                    disabled={accountBusy}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {transferFormOpen && canManageAccounts && activeAccounts.length >= 2 && (
            <Modal
              title="Transfer between accounts"
              onClose={transfer.isPending ? () => undefined : () => setTransferFormOpen(false)}
            >
              <form
                className="form-grid"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  setError(null);
                  setMessage(null);
                  transfer.mutate();
                }}
              >
                <label>
                  From *
                  <select
                    required
                    value={transferForm.from_account_id}
                    onChange={(e) =>
                      setTransferForm((f) => ({ ...f, from_account_id: e.target.value }))
                    }
                  >
                    <option value="">Select...</option>
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bank_name} · {a.account_number}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  To *
                  <select
                    required
                    value={transferForm.to_account_id}
                    onChange={(e) =>
                      setTransferForm((f) => ({ ...f, to_account_id: e.target.value }))
                    }
                  >
                    <option value="">Select...</option>
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bank_name} · {a.account_number}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Amount *
                  <input
                    required
                    inputMode="decimal"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
                    onBlur={(e) => {
                      const next = formatAmountOnBlur(e.target.value);
                      if (next !== transferForm.amount) {
                        setTransferForm((f) => ({ ...f, amount: next }));
                      }
                    }}
                  />
                </label>
                <label>
                  Date *
                  <input
                    type="date"
                    required
                    value={transferForm.transaction_date}
                    onChange={(e) =>
                      setTransferForm((f) => ({ ...f, transaction_date: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Status
                  <select
                    value={transferForm.status}
                    onChange={(e) =>
                      setTransferForm((f) => ({ ...f, status: e.target.value as SourceTxnStatus }))
                    }
                  >
                    {CREATE_TXN_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="span-all">
                  Remarks
                  <input
                    value={transferForm.remarks}
                    onChange={(e) => setTransferForm((f) => ({ ...f, remarks: e.target.value }))}
                  />
                </label>
                <div className="span-all form-actions">
                  <button type="submit" className="btn primary" disabled={transfer.isPending}>
                    {transfer.isPending ? 'Saving…' : 'Transfer'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setTransferFormOpen(false)}
                    disabled={transfer.isPending}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Modal>
          )}
        </>
      )}

      {(mode === 'deposit' || mode === 'withdrawal') && (
        <>
          <p className="hint">
            Available balance = POSTED deposits minus withdrawals in POSTED / PENDING / RESERVED / ON_HOLD.
            CANCELLED and REVERSED have no balance effect.
          </p>

          {txnFormOpen && (
            <Modal
              title={mode === 'deposit' ? 'New deposit' : 'New withdrawal'}
              onClose={createTxn.isPending ? () => undefined : () => setTxnFormOpen(false)}
            >
              <form
                className="form-grid"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  setError(null);
                  setMessage(null);
                  createTxn.mutate();
                }}
              >
                <label>
                  Account *
                  <select
                    required
                    value={txnForm.source_account_id}
                    onChange={(e) => setTxnForm((f) => ({ ...f, source_account_id: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bank_name} · {a.account_number} ({formatMoney(a.available_balance ?? '0')})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Amount *
                  <input
                    required
                    inputMode="decimal"
                    value={txnForm.amount}
                    onChange={(e) => setTxnForm((f) => ({ ...f, amount: e.target.value }))}
                    onBlur={(e) => {
                      const next = formatAmountOnBlur(e.target.value);
                      if (next !== txnForm.amount) setTxnForm((f) => ({ ...f, amount: next }));
                    }}
                  />
                </label>
                <label>
                  Date *
                  <input
                    type="date"
                    required
                    value={txnForm.transaction_date}
                    onChange={(e) => setTxnForm((f) => ({ ...f, transaction_date: e.target.value }))}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={txnForm.status}
                    onChange={(e) =>
                      setTxnForm((f) => ({ ...f, status: e.target.value as SourceTxnStatus }))
                    }
                  >
                    {CREATE_TXN_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="span-all">
                  Remarks
                  <input
                    value={txnForm.remarks}
                    onChange={(e) => setTxnForm((f) => ({ ...f, remarks: e.target.value }))}
                  />
                </label>
                <div className="span-all form-actions">
                  <button type="submit" className="btn primary" disabled={createTxn.isPending}>
                    {createTxn.isPending
                      ? 'Saving…'
                      : mode === 'deposit'
                        ? 'Add deposit'
                        : 'Add withdrawal'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setTxnFormOpen(false)}
                    disabled={createTxn.isPending}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Modal>
          )}

          <div className="card filters">
            <label>
              Filter by account
              <select
                value={filterAccountId}
                onChange={(e) => setFilterAccountId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">All accounts</option>
                {accounts.data?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bank_name} · {a.account_number}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bank name</th>
                  <th>Account number</th>
                  <th className="num">{mode === 'deposit' ? 'Deposit' : 'Withdraw'}</th>
                  <th>Transaction date</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {txns.isLoading && (
                  <tr>
                    <td colSpan={6}>Loading...</td>
                  </tr>
                )}
                {filteredTxns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      No {mode === 'deposit' ? 'deposits' : 'withdrawals'} yet.
                    </td>
                  </tr>
                )}
                {filteredTxns.map((t) => (
                  <tr key={t.id}>
                    <td>{t.bank_name}</td>
                    <td>{t.account_number}</td>
                    <td className="num">
                      {formatMoney(mode === 'deposit' ? t.deposit_amount : t.withdraw_amount)}
                    </td>
                    <td>{formatDate(t.transaction_date)}</td>
                    <td>
                      <select
                        value={t.status}
                        disabled={patchTxn.isPending}
                        onChange={(e) =>
                          patchTxn.mutate({ id: t.id, status: e.target.value as SourceTxnStatus })
                        }
                      >
                        {SOURCE_TXN_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {t.remarks ?? <span className="muted">-</span>}
                      {t.payable_id != null && (
                        <div className="muted small">
                          <Link to={`/payables/${t.payable_id}`}>Payable #{t.payable_id}</Link>
                        </div>
                      )}
                      {t.receivable_id != null && (
                        <div className="muted small">
                          <Link to={`/receivables/${t.receivable_id}`}>Receivable #{t.receivable_id}</Link>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
