import Link from "next/link";
import type { SessionUser } from "@/lib/matters/acl";
import { isLegalRole } from "@/lib/matters/acl";

function homeForRole(role: string): string {
  if (role === "requester") return "/request";
  if (role === "manager") return "/manager/portfolio";
  return "/legal";
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const nav: { href: string; label: string; roles: string[] }[] = [
    { href: homeForRole(user.role), label: "Home", roles: ["requester", "legal", "assigner", "manager", "admin"] },
    { href: "/request/new", label: "New request", roles: ["requester"] },
    { href: "/legal/pool", label: "Assignment pool", roles: ["legal", "assigner", "admin"] },
    { href: "/legal/matters", label: "Matters", roles: ["legal", "assigner", "manager", "admin"] },
    { href: "/manager/portfolio", label: "Portfolio", roles: ["manager", "admin"] },
    { href: "/manager/expiry", label: "Expiry watch", roles: ["manager", "legal", "admin"] },
  ];

  return (
    <div className="min-h-screen flex">
      <aside
        className="no-print hidden md:flex flex-col w-[var(--nav-width)] bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)] p-4 shrink-0"
      >
        <BrandMark />
        <nav className="flex flex-col gap-1 mt-6 flex-1">
          {nav
            .filter((n) => n.roles.includes(user.role))
            .map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-2 rounded-md text-sm hover:bg-[var(--color-bg-page)] text-[var(--color-text-primary)]"
              >
                {n.label}
              </Link>
            ))}
        </nav>
        <div className="text-xs text-[var(--color-text-muted)] border-t pt-3 mt-3">
          <p className="font-medium text-[var(--color-text-primary)]">{user.name}</p>
          <p>{user.role}</p>
          <form action="/api/auth/logout" method="post" className="mt-2">
            <button type="submit" className="text-[var(--color-brand-primary)] underline text-left">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="no-print md:hidden border-b bg-white px-4 py-3 flex justify-between items-center">
          <BrandMark compact />
          {isLegalRole(user.role) && (
            <Link href="/legal/pool" className="text-sm text-[var(--color-brand-primary)]">
              Pool
            </Link>
          )}
        </header>
        <main className="p-4 md:p-6 max-w-[1200px]">{children}</main>
      </div>
    </div>
  );
}

function BrandMark({ compact }: { compact?: boolean } = {}) {
  return (
    <div>
      <p className={`font-semibold ${compact ? "text-sm" : "text-base"} text-[var(--color-brand-primary)]`}>
        GBPI Legal Contract Ops
      </p>
      {!compact && (
        <p className="text-xs text-[var(--color-text-muted)]">Pilot · Status, custody, expiry</p>
      )}
    </div>
  );
}