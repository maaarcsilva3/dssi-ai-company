import { useEffect, useState, type FormEvent } from "react";
import {
  type AuthStatus,
  type Deliverable,
  type Employee,
  type RoleId,
  fetchAuthStatus,
  fetchDeliverables,
  fetchRoster,
  postObjective,
  updateRoleBrief,
} from "./api";

export default function App() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [objective, setObjective] = useState("");
  const [roster, setRoster] = useState<Employee[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<RoleId | null>(null);
  const [draftFn, setDraftFn] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function refresh() {
    const [employees, arts] = await Promise.all([
      fetchRoster(),
      fetchDeliverables(),
    ]);
    setRoster(employees);
    setDeliverables([...arts].reverse());
  }

  async function checkAuth() {
    setAuthError(null);
    try {
      const next = await fetchAuthStatus();
      setAuth(next);
      if (next.signedIn) {
        await refresh();
      }
    } catch (err) {
      setAuth(null);
      setAuthError(
        err instanceof Error
          ? `${err.message} — start HQ with: cd ai-company && npm run serve`
          : "Failed to reach HQ",
      );
    }
  }

  useEffect(() => {
    checkAuth().catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!objective.trim() || busy) return;
    setBusy(true);
    setStatus("Objective sent to HQ…");
    try {
      const res = await postObjective(objective.trim());
      setStatus(
        res.continuationToken
          ? `Accepted (${res.continuationToken}). Refresh deliverables in a moment.`
          : "Accepted. Refresh deliverables in a moment.",
      );
      setObjective("");
      window.setTimeout(() => {
        refresh().catch(() => undefined);
      }, 4000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to post objective");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(emp: Employee) {
    setEditing(emp.role);
    setDraftFn(emp.function);
  }

  async function saveEdit(role: RoleId) {
    setBusy(true);
    try {
      await updateRoleBrief(role, draftFn.trim());
      setEditing(null);
      await refresh();
      setStatus(`Updated ${role} brief.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update brief");
    } finally {
      setBusy(false);
    }
  }

  if (!auth?.signedIn) {
    return (
      <div className="page">
        <div className="atmosphere" aria-hidden="true" />
        <header className="hero">
          <p className="eyebrow">CEO console</p>
          <h1 className="brand">AI Company</h1>
          <p className="lede">
            Sign in to Cursor before using the playground or assigning work to
            employees.
          </p>
          <div className="login-gate">
            <p className="login-title">Login required</p>
            <ol className="login-steps">
              <li>
                In a terminal: <code>cd ai-company</code>
              </li>
              <li>
                Run <code>npm run serve</code> — it opens browser login first,
                then starts HQ
              </li>
              <li>
                Or run <code>npm run login</code>, then{" "}
                <code>npm run serve</code>
              </li>
              <li>
                Open the playground only after login succeeds:{" "}
                <code>http://127.0.0.1:3000/playground</code>
              </li>
            </ol>
            <div className="cta-row">
              <button type="button" onClick={() => checkAuth()}>
                I signed in — check again
              </button>
            </div>
            {authError ? (
              <p className="status" role="status">
                {authError}
              </p>
            ) : null}
            {auth && !auth.signedIn ? (
              <p className="status" role="status">
                HQ is up, but no Cursor credential was found. Finish{" "}
                <code>npm run login</code> / <code>npm run serve</code> first.
              </p>
            ) : null}
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="atmosphere" aria-hidden="true" />

      <header className="hero">
        <p className="eyebrow">CEO console · signed in via {auth.source}</p>
        <h1 className="brand">AI Company</h1>
        <p className="lede">
          Set the objective. Your AI staff — product, eng, QA, design, marketing,
          finance — runs the work.
        </p>

        <form className="objective-form" onSubmit={onSubmit}>
          <label htmlFor="objective" className="sr-only">
            Company objective
          </label>
          <textarea
            id="objective"
            name="objective"
            rows={4}
            placeholder="Ship a landing page for our B2B analytics SaaS. Budget $5k. Engage engineer, marketer, and finance."
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            disabled={busy}
          />
          <div className="cta-row">
            <button type="submit" disabled={busy || !objective.trim()}>
              {busy ? "Sending…" : "Set objective"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => refresh().catch(() => undefined)}
              disabled={busy}
            >
              Refresh status
            </button>
          </div>
        </form>

        {status ? <p className="status" role="status">{status}</p> : null}
      </header>

      <section className="section" aria-labelledby="roster-heading">
        <h2 id="roster-heading">Roster</h2>
        <p className="section-lede">
          Assign each employee their function. Briefs persist in HQ storage.
        </p>
        <ul className="roster">
          {roster.map((emp) => (
            <li key={emp.role} className="roster-row">
              <div className="roster-meta">
                <span className="role-title">{emp.title}</span>
                <span className="role-id">{emp.role}</span>
              </div>
              {editing === emp.role ? (
                <div className="edit-block">
                  <textarea
                    rows={3}
                    value={draftFn}
                    onChange={(e) => setDraftFn(e.target.value)}
                  />
                  <div className="cta-row">
                    <button
                      type="button"
                      onClick={() => saveEdit(emp.role)}
                      disabled={busy || !draftFn.trim()}
                    >
                      Save brief
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setEditing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="role-fn">{emp.function}</p>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => startEdit(emp)}
                  >
                    Edit function
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="del-heading">
        <h2 id="del-heading">Deliverables</h2>
        <p className="section-lede">
          Artifacts logged by the COO and specialists after each run.
        </p>
        {deliverables.length === 0 ? (
          <p className="empty">No deliverables yet. Set an objective above.</p>
        ) : (
          <ul className="deliverables">
            {deliverables.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="del-toggle"
                  onClick={() =>
                    setExpanded((cur) => (cur === d.id ? null : d.id))
                  }
                  aria-expanded={expanded === d.id}
                >
                  <span className="del-title">{d.title}</span>
                  <span className="del-meta">
                    {d.role} · {d.kind}
                    {d.machine ? ` · ${d.machine}` : ""} ·{" "}
                    {new Date(d.createdAt).toLocaleString()}
                  </span>
                </button>
                {expanded === d.id ? (
                  <pre className="del-body">{d.body}</pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="foot">
        HQ agent playground:{" "}
        <code>http://127.0.0.1:3000/playground</code>
      </footer>
    </div>
  );
}
