import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, errorMessage, type AiAskResponse } from '../api';
import { formatMoney } from '../format';
import { AmountBarChart, AmountDoughnutChart } from '../reportCharts';
import { ErrorBox } from '../components';

const IDLE_MS = 30 * 60 * 1000;
const STORAGE_KEY = 'ap-tracker-ai-chat-id';
const ACTIVITY_KEY = 'ap-tracker-ai-chat-activity';

function newChatId(): string {
  return crypto.randomUUID();
}

function loadChatId(): string {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    const last = Number(sessionStorage.getItem(ACTIVITY_KEY) ?? 0);
    if (existing && last && Date.now() - last <= IDLE_MS) return existing;
  } catch {
    /* ignore */
  }
  const id = newChatId();
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
    sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  return id;
}

function touchActivity(chatId: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, chatId);
    sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

interface DisplayTurn {
  role: 'user' | 'assistant';
  content: string;
  datasets?: AiAskResponse['datasets'];
  chart?: AiAskResponse['chart'];
  pendingAction?: AiAskResponse['pendingAction'];
}

function cellValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function chartRows(
  chart: NonNullable<AiAskResponse['chart']> | null | undefined,
  datasets: AiAskResponse['datasets'] | undefined,
) {
  if (!chart?.labelColumn || !chart.valueColumn || !datasets) return null;
  const match = datasets.find(
    (d) => d.columns.includes(chart.labelColumn!) && d.columns.includes(chart.valueColumn!) && d.rows.length > 0,
  );
  return match ?? null;
}

function ResultChart({
  chart,
  columns,
  rows,
}: {
  chart: NonNullable<AiAskResponse['chart']>;
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  const labelCol = chart.labelColumn && columns.includes(chart.labelColumn) ? chart.labelColumn : columns[0];
  const valueCol =
    chart.valueColumn && columns.includes(chart.valueColumn)
      ? chart.valueColumn
      : columns.find((c) => c !== labelCol) ?? columns[1];
  if (!labelCol || !valueCol) return null;
  const labels = rows.map((r) => cellValue(r[labelCol]));
  const values = rows.map((r) => {
    const n = Number(r[valueCol]);
    return Number.isFinite(n) ? n : 0;
  });
  if (chart.type === 'doughnut') {
    return (
      <div className="ai-inline-chart">
        <AmountDoughnutChart labels={labels} values={values} />
      </div>
    );
  }
  if (chart.type === 'bar') {
    return (
      <div className="ai-inline-chart">
        <AmountBarChart labels={labels} values={values} />
      </div>
    );
  }
  return null;
}

function ResultsTable({ columns, rows }: { columns: string[]; rows: Record<string, unknown>[] }) {
  return (
    <div className="table-wrap ai-result-table">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, i) => (
            <tr key={i}>
              {columns.map((c) => {
                const raw = row[c];
                const text = cellValue(raw);
                const moneyish = /amount|total|gross|vat|ewt|net|balance|price/i.test(c);
                return (
                  <td key={c} className={moneyish ? 'num' : undefined}>
                    {moneyish && raw != null && raw !== '' && Number.isFinite(Number(raw))
                      ? formatMoney(String(raw))
                      : text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Floating Ask AI launcher + popup (admin). Same assistant as Telegram. */
export function AskAiPanel() {
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState(loadChatId);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<DisplayTurn[]>([]);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<AiAskResponse['pendingAction']>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (body: { question: string; chatId: string }) => api.post<AiAskResponse>('/reports/ask', body),
    onSuccess: (data) => {
      touchActivity(data.chatId);
      setChatId(data.chatId);
      setPendingAction(data.pendingAction ?? null);
      if (data.sessionReset) {
        setSessionNotice('Previous chat timed out after idle. Started a new session.');
      } else {
        setSessionNotice(null);
      }
      // keep open when collecting fields/files
      if (data.pendingAction?.awaiting) setOpen(true);

      const assistant: DisplayTurn = {
        role: 'assistant',
        content: data.explanation,
        datasets: data.datasets ?? [],
        chart: data.chart,
        pendingAction: data.pendingAction ?? null,
      };

      setTurns((prev) => {
        if (data.sessionReset) {
          const lastUser = prev.filter((t) => t.role === 'user').at(-1);
          return lastUser ? [lastUser, assistant] : [assistant];
        }
        return [...prev, assistant];
      });
      setError(null);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [turns, ask.isPending, open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const onNewChat = () => {
    const id = newChatId();
    setChatId(id);
    touchActivity(id);
    setTurns([]);
    setSessionNotice(null);
    setError(null);
    setPendingAction(null);
    setQuestion('');
    inputRef.current?.focus();
  };

  const sendQuestion = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || ask.isPending) return;

    let id = chatId;
    try {
      const last = Number(sessionStorage.getItem(ACTIVITY_KEY) ?? 0);
      if (last && Date.now() - last > IDLE_MS) {
        id = newChatId();
        setChatId(id);
        setTurns([]);
        setPendingAction(null);
        setSessionNotice('Started a new session after idle timeout.');
      }
    } catch {
      /* ignore */
    }

    setTurns((prev) => [...prev, { role: 'user', content: trimmed }]);
    setQuestion('');
    setError(null);
    ask.mutate({ question: trimmed, chatId: id });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendQuestion(question);
  };

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(question);
    }
  };

  const pending = ask.isPending;
  const unreadHint = !open && turns.length > 0 && turns.at(-1)?.role === 'assistant';
  const needsFile = pendingAction?.awaiting === 'file';

  const onAttachFile = async (file: File | null) => {
    if (!file || pending) return;
    setError(null);
    setTurns((prev) => [...prev, { role: 'user', content: `📎 ${file.name}` }]);
    try {
      const fd = new FormData();
      fd.append('chatId', chatId);
      fd.append('file', file);
      const data = await api.post<{
        chatId: string;
        explanation: string;
        pendingAction?: AiAskResponse['pendingAction'];
      }>('/reports/ask/attachment', fd);
      touchActivity(data.chatId);
      setChatId(data.chatId);
      setPendingAction(data.pendingAction ?? null);
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.explanation,
          pendingAction: data.pendingAction ?? null,
        },
      ]);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className={`ai-chat-widget${open ? ' is-open' : ''}`} ref={panelRef}>
      {open && (
        <div
          className="ai-chat-popup"
          role="dialog"
          aria-modal="true"
          aria-label="Ask AI"
        >
          <header className="ai-chat-popup-header">
            <div>
              <strong>Ask AI</strong>
              <p className="muted small">Same assistant as Telegram</p>
            </div>
            <div className="ai-chat-popup-actions">
              <button type="button" className="btn small ghost" onClick={onNewChat} disabled={pending}>
                New
              </button>
              <button
                type="button"
                className="ai-chat-close"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
          </header>

          {sessionNotice && <p className="alert info ai-chat-notice">{sessionNotice}</p>}
          <ErrorBox error={error} />

          <div className="ai-chat-log" ref={logRef}>
            {turns.length === 0 && !pending && (
              <p className="muted ai-chat-empty">
                Try: “Upcoming releases next week”, “Total paid this month by method”, or “don’t include overdue”.
              </p>
            )}
            {turns.map((t, i) => {
              const plotted = t.role === 'assistant' ? chartRows(t.chart, t.datasets) : null;
              return (
                <div key={i} className={`ai-bubble ai-bubble-${t.role}`}>
                  <div className="ai-bubble-role">{t.role === 'user' ? 'You' : 'AI'}</div>
                  {t.role === 'assistant' ? (
                    <div className="ai-bubble-body ai-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="ai-bubble-body">{t.content}</div>
                  )}
                  {t.role === 'assistant' && t.chart && plotted && (
                    <ResultChart chart={t.chart} columns={plotted.columns} rows={plotted.rows} />
                  )}
                  {t.role === 'assistant' &&
                    t.datasets?.map((d, j) =>
                      d.rows.length > 0 ? (
                        <details key={j} className="ai-details">
                          <summary>
                            {d.purpose} ({d.rowCount} row{d.rowCount === 1 ? '' : 's'})
                          </summary>
                          <ResultsTable columns={d.columns} rows={d.rows} />
                        </details>
                      ) : null,
                    )}
                </div>
              );
            })}
            {pending && <p className="muted">Working…</p>}
          </div>

          {pendingAction && !pending && !pendingAction.awaiting && (
            <div className="ai-chat-confirm">
              <button type="button" className="btn primary small" onClick={() => sendQuestion('confirm')}>
                Confirm
              </button>
              <button type="button" className="btn small" onClick={() => sendQuestion('cancel')}>
                Cancel
              </button>
            </div>
          )}

          {needsFile && !pending && (
            <div className="ai-chat-confirm">
              <label className="btn small ai-chat-attach">
                Attach file
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  hidden
                  onChange={(e) => {
                    void onAttachFile(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
              </label>
              <button type="button" className="btn small" onClick={() => sendQuestion('cancel')}>
                Cancel
              </button>
            </div>
          )}

          <form className="ai-ask-form ai-chat-composer" onSubmit={onSubmit}>
            <textarea
              ref={inputRef}
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder={
                needsFile
                  ? 'Or attach a file above…'
                  : pendingAction?.awaiting
                    ? 'Reply with the requested value…'
                    : 'Ask about AP, AR, or a status change…'
              }
              disabled={pending}
            />
            <button type="submit" className="btn primary" disabled={pending || !question.trim()}>
              {pending ? '…' : 'Send'}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={`ai-chat-launcher${open ? ' is-open' : ''}${unreadHint ? ' has-reply' : ''}`}
        aria-expanded={open}
        aria-label={open ? 'Close Ask AI' : 'Open Ask AI'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '×' : 'AI'}
      </button>
    </div>
  );
}
