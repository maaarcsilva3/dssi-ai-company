import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, type Settings } from '../api';
import { useSettings } from '../hooks';
import { ErrorBox } from '../components';
import { addDays, formatDate, WEEKDAYS } from '../format';

type Form = Omit<Settings, 'today'>;

function nextRelease(today: string, weekday: number): string {
  const [y, m, d] = today.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(today, (weekday - dow + 7) % 7);
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const settings = useSettings();
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data) {
      const { today: _today, ...rest } = settings.data;
      setForm({ ...rest, ar_due_days: rest.ar_due_days ?? 30 });
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (body: Form) => api.put<Settings>('/settings', body),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['upcoming'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (settings.error) return <ErrorBox error={errorMessage(settings.error)} />;
  if (!form || !settings.data) return <p>Loading...</p>;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setSaved(false);
    setForm({ ...form, [k]: v });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    save.mutate(form);
  };

  const release = nextRelease(settings.data.today, form.release_weekday);
  const start = addDays(release, -form.days_before);
  const end = addDays(release, form.days_after);

  return (
    <section>
      <div className="page-header">
        <h1>Settings</h1>
      </div>
      <form className="card form-grid" onSubmit={onSubmit}>
        <h2 className="span-all">Release schedule</h2>
        <label>
          Release day
          <select value={form.release_weekday} onChange={(e) => set('release_weekday', Number(e.target.value))}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Days before
          <input
            type="number"
            min={0}
            max={365}
            required
            value={form.days_before}
            onChange={(e) => set('days_before', Number(e.target.value))}
          />
          <span className="hint">Deadlines included this many days before release (7 = one week)</span>
        </label>
        <label>
          Days after
          <input
            type="number"
            min={0}
            max={365}
            required
            value={form.days_after}
            onChange={(e) => set('days_after', Number(e.target.value))}
          />
          <span className="hint">Use 6 to cover items due before the next weekly release</span>
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={form.include_overdue} onChange={(e) => set('include_overdue', e.target.checked)} />
          Include overdue (carried over)
        </label>
        <label>
          Timezone
          <input value={form.timezone} onChange={(e) => set('timezone', e.target.value)} required />
          <span className="hint">IANA zone for “today”, e.g. Asia/Manila</span>
        </label>

        <h2 className="span-all">Accounts receivable</h2>
        <label>
          AR due days
          <input
            type="number"
            min={0}
            max={365}
            required
            value={form.ar_due_days}
            onChange={(e) => set('ar_due_days', Number(e.target.value))}
          />
          <span className="hint">Due date = billing date + these days on SI import (default 30)</span>
        </label>

        <div className="span-all alert info">
          With these settings, the next release and collection is <strong>{formatDate(release)}</strong> and it will cover deadlines from{' '}
          <strong>{form.include_overdue ? 'any earlier date' : formatDate(start)}</strong> to <strong>{formatDate(end)}</strong>.
        </div>

        <div className="span-all">
          <ErrorBox error={error} />
          {saved && <div className="alert success">Settings saved.</div>}
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={save.isPending}>
              Save settings
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
