import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 max-w-md text-center">
        <h1 className="text-lg font-semibold">Access denied</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-2">
          You don&apos;t have access to this matter or section.
        </p>
        <Link href="/" className="btn-primary inline-block mt-6 text-sm">
          Back to home
        </Link>
      </div>
    </div>
  );
}