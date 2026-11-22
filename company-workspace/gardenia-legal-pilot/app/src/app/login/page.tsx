import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const allUsers = getDb().select().from(users).all();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[var(--color-bg-page)]">
      <div className="card w-full max-w-[420px] p-8">
        <h1 className="text-xl font-semibold text-[var(--color-brand-primary)]">
          GBPI Legal Contract Ops
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Pilot demo · Status, custody, and expiry—not drafting.
        </p>
        <p className="text-sm text-[var(--color-text-secondary)] mt-6 mb-3">
          Select a demo account (no password):
        </p>
        <ul className="space-y-2">
          {allUsers.map((u) => (
            <li key={u.id}>
              <form action={loginAction}>
                <input type="hidden" name="userId" value={u.id} />
                <button
                  type="submit"
                  className="w-full text-left px-4 py-3 rounded-md border border-[var(--color-border-subtle)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-bg-page)] transition-colors"
                >
                  <span className="font-medium block">{u.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {u.email} · {u.role}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--color-text-muted)] mt-6 border-t pt-4">
          DSSI pilot · Local demo · Data stays on this machine
        </p>
      </div>
    </div>
  );
}