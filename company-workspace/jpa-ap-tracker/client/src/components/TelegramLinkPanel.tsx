import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  errorMessage,
  type AppUser,
  type TelegramLinkCodeResponse,
  type TelegramLinksOverview,
} from '../api';
import { ConfirmDialog, ErrorBox, type ConfirmRequest } from '../components';
import { useAuth } from '../auth';

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function TelegramLinkPanel() {
  const auth = useAuth();
  const qc = useQueryClient();
  const [targetUserId, setTargetUserId] = useState<string>(() => String(auth.user?.id ?? ''));
  const [lastCode, setLastCode] = useState<TelegramLinkCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const overview = useQuery({
    queryKey: ['telegram-links'],
    queryFn: () => api.get<TelegramLinksOverview>('/reports/telegram/links'),
    refetchInterval: 30_000,
  });

  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<AppUser[]>('/users'),
  });

  const admins = useMemo(
    () => (users.data ?? []).filter((u) => u.role === 'admin' && u.active),
    [users.data],
  );

  const createCode = useMutation({
    mutationFn: (userId: number) =>
      api.post<TelegramLinkCodeResponse>('/reports/telegram/link-code', { userId }),
    onSuccess: async (data) => {
      setLastCode(data);
      setCopiedCode(null);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['telegram-links'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const unlink = useMutation({
    mutationFn: (userId: number) =>
      api.del<{ ok: boolean }>(`/reports/telegram/link?userId=${userId}`),
    onSuccess: async () => {
      setConfirm(null);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['telegram-links'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const cancelCode = useMutation({
    mutationFn: (code: string) => api.del<{ ok: boolean }>(`/reports/telegram/link-code/${encodeURIComponent(code)}`),
    onSuccess: async (_data, code) => {
      setConfirm(null);
      if (lastCode?.code === code) setLastCode(null);
      setError(null);
      await qc.invalidateQueries({ queryKey: ['telegram-links'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const onCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(`/link ${code}`);
      setCopiedCode(code);
    } catch {
      setCopiedCode(null);
    }
  };

  const data = overview.data;
  const pending = createCode.isPending || unlink.isPending || cancelCode.isPending;
  const selectedId = Number(targetUserId) || auth.user?.id;

  return (
    <div className="card telegram-link-panel">
      <div className="page-header">
        <div>
          <h2>Telegram</h2>
          <p className="muted">
            Generate link codes for any admin account, then send <code>/link CODE</code> from that
            person&apos;s Telegram. You can also unlink accounts from here.
          </p>
        </div>
      </div>

      <ErrorBox error={error ?? (overview.isError ? errorMessage(overview.error) : null)} />

      {overview.isLoading && <p className="muted">Loading Telegram bindings…</p>}

      {data && !data.botConfigured && (
        <p className="alert info">
          Bot is not configured on the server yet. Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, and
          TELEGRAM_WEBHOOK_BASE_URL, then restart the app.
        </p>
      )}

      <div className="filters" style={{ marginBottom: '1rem' }}>
        <label className="filter-party">
          Admin account
          <select
            value={targetUserId || String(auth.user?.id ?? '')}
            onChange={(e) => setTargetUserId(e.target.value)}
            disabled={users.isLoading || pending}
          >
            {admins.length === 0 && auth.user && (
              <option value={auth.user.id}>
                {auth.user.display_name} (@{auth.user.username})
              </option>
            )}
            {admins.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name} (@{u.username})
                {data?.links.some((l) => l.userId === u.id) ? ' — linked' : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn primary small"
          disabled={pending || !selectedId}
          onClick={() => selectedId && createCode.mutate(selectedId)}
        >
          {createCode.isPending ? 'Generating…' : 'Generate link code'}
        </button>
      </div>

      {lastCode && (
        <div className="telegram-code-box">
          <p>
            Code for <strong>{lastCode.displayName}</strong> (expires {formatExpiry(lastCode.expiresAt)}):
          </p>
          <p className="telegram-code">
            <code>/link {lastCode.code}</code>
          </p>
          <div className="row gap">
            <button type="button" className="btn small" onClick={() => onCopy(lastCode.code)}>
              {copiedCode === lastCode.code ? 'Copied' : 'Copy command'}
            </button>
          </div>
        </div>
      )}

      <h3 className="form-section-title">Linked accounts</h3>
      {(data?.links.length ?? 0) === 0 ? (
        <p className="muted">No Telegram accounts linked yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Admin</th>
                <th>Telegram user</th>
                <th>Linked</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.links.map((row) => (
                <tr key={row.userId}>
                  <td>
                    {row.displayName}
                    <div className="muted small">@{row.username}</div>
                  </td>
                  <td>{row.telegramUserId}</td>
                  <td>{formatExpiry(row.linkedAt)}</td>
                  <td className="actions">
                    <button
                      type="button"
                      className="btn small danger"
                      disabled={pending}
                      onClick={() =>
                        setConfirm({
                          title: 'Unlink Telegram',
                          message: `Unlink ${row.displayName} from Telegram user ${row.telegramUserId}?`,
                          confirmLabel: 'Unlink',
                          onConfirm: () => unlink.mutate(row.userId),
                        })
                      }
                    >
                      Unlink
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="form-section-title" style={{ marginTop: '1.25rem' }}>
        Pending codes
      </h3>
      {(data?.pendingCodes.length ?? 0) === 0 ? (
        <p className="muted">No unused link codes.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Admin</th>
                <th>Code</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.pendingCodes.map((row) => (
                <tr key={row.code}>
                  <td>
                    {row.displayName}
                    <div className="muted small">@{row.username}</div>
                  </td>
                  <td>
                    <code>/link {row.code}</code>
                  </td>
                  <td>{formatExpiry(row.expiresAt)}</td>
                  <td className="actions">
                    <button type="button" className="btn small" disabled={pending} onClick={() => onCopy(row.code)}>
                      {copiedCode === row.code ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      className="btn small danger"
                      disabled={pending}
                      onClick={() =>
                        setConfirm({
                          title: 'Cancel link code',
                          message: `Cancel pending code for ${row.displayName} (/link ${row.code})?`,
                          confirmLabel: 'Cancel code',
                          onConfirm: () => cancelCode.mutate(row.code),
                        })
                      }
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        request={confirm}
        pending={unlink.isPending || cancelCode.isPending}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
