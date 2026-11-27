import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { PermissionKey } from './api';
import { useAuth } from './auth';
import LoginPage from './pages/LoginPage';
import PayablesPage from './pages/PayablesPage';
import PayableFormPage from './pages/PayableFormPage';
import UpcomingReleasePage from './pages/UpcomingReleasePage';
import MasterdataPage from './pages/MasterdataPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import SourceAccountsPage from './pages/SourceAccountsPage';
import LiquidationsPage from './pages/LiquidationsPage';
import LiquidationDetailPage from './pages/LiquidationDetailPage';
import PettyCashPage from './pages/PettyCashPage';
import ReceivablesBillingPage from './pages/ReceivablesBillingPage';
import ArClientsPage from './pages/ArClientsPage';
import SuppliersPage from './pages/SuppliersPage';
import { AskAiPanel } from './components/AskAiPanel';
import { NotificationBell } from './components/NotificationBell';
import { BrandMark } from './brand';
import { LedgerProvider, payableLedger } from './ledger';

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onCloseRef.current();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return ref;
}

function NavMenu({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="nav-menu" ref={ref}>
      <button
        type="button"
        className={`tab nav-menu-trigger${active ? ' active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <span className="nav-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="nav-menu-panel" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

function UserMenu({ displayName }: { displayName: string }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {displayName}
        <span className="nav-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="user-menu-panel">
          <button
            type="button"
            className="user-menu-item"
            onClick={async () => {
              setOpen(false);
              await auth.logout();
              navigate('/login', { replace: true });
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (auth.loading) return <p className="content">Loading...</p>;
  if (!auth.user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequirePerm({ perm, children }: { perm: PermissionKey; children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth.can(perm)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireAr({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (!(auth.isAdmin || auth.can('ar_view') || auth.can('ar_edit'))) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireAnyPerm({ perms, children }: { perms: PermissionKey[]; children: React.ReactNode }) {
  const auth = useAuth();
  if (!(auth.isAdmin || perms.some((p) => auth.can(p)))) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Shell() {
  const auth = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const topbarRef = useRef<HTMLElement>(null);
  const canAr = auth.isAdmin || auth.can('ar_view') || auth.can('ar_edit');
  const canPayables = auth.can('payables_view');
  const canRelease = auth.can('upcoming_release');
  const canSuppliers = auth.can('suppliers') || auth.isAdmin;
  const showPayablesMenu = canPayables || canRelease || canSuppliers;
  const canSettings = auth.can('settings');
  const canMasterdata = auth.can('masterdata');
  const showSettingsMenu = canSettings || canMasterdata || auth.isAdmin;
  const path = location.pathname;
  const payablesActive = path.startsWith('/payables') || path.startsWith('/release');
  const receivablesActive = path.startsWith('/receivables');
  const sourceAccountsActive = path.startsWith('/source-accounts');
  const canSourceAccounts = auth.isAdmin || auth.can('source_accounts');
  const settingsActive =
    path.startsWith('/settings') || path.startsWith('/masterdata') || path.startsWith('/users');
  const itemClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-menu-item active' : 'nav-menu-item');
  const tabClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'tab active' : 'tab');
  const closeMenu = () => setMenuOpen(false);

  const home =
    (canPayables && '/payables') ||
    (canAr && '/receivables/details') ||
    (canSourceAccounts && '/source-accounts') ||
    (auth.can('liquidations_view') && '/liquidations') ||
    (auth.can('petty_cash_view') && '/petty-cash') ||
    (auth.isAdmin && '/reports') ||
    (canSettings && '/settings') ||
    (canRelease && '/release') ||
    (canSuppliers && '/payables/suppliers') ||
    '/login';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  const desktopNav = (
    <>
      {showPayablesMenu && (
        <NavMenu label="Payables" active={payablesActive}>
          {canPayables && (
            <NavLink to="/payables" end className={itemClass}>
              Payables
            </NavLink>
          )}
          {canRelease && (
            <NavLink to="/release" className={itemClass}>
              Upcoming Release
            </NavLink>
          )}
          {canSuppliers && (
            <NavLink to="/payables/suppliers" className={itemClass}>
              Suppliers
            </NavLink>
          )}
        </NavMenu>
      )}
      {canAr && (
        <NavMenu label="Receivables" active={receivablesActive}>
          <NavLink to="/receivables/details" className={itemClass}>
            Billing lines
          </NavLink>
          <NavLink to="/receivables/summary" className={itemClass}>
            Monthly summary
          </NavLink>
          <NavLink to="/receivables/clients" className={itemClass}>
            Clients
          </NavLink>
        </NavMenu>
      )}
      {canSourceAccounts && (
        <NavMenu label="Source Accounts" active={sourceAccountsActive}>
          <NavLink to="/source-accounts" end className={itemClass}>
            Accounts
          </NavLink>
          <NavLink to="/source-accounts/deposit" className={itemClass}>
            Deposit
          </NavLink>
          <NavLink to="/source-accounts/withdrawal" className={itemClass}>
            Withdrawal
          </NavLink>
        </NavMenu>
      )}
      {auth.can('liquidations_view') && (
        <NavLink to="/liquidations" className={tabClass}>
          Liquidations
        </NavLink>
      )}
      {auth.can('petty_cash_view') && (
        <NavLink to="/petty-cash" className={tabClass}>
          Petty Cash
        </NavLink>
      )}
      {auth.isAdmin && (
        <NavLink to="/reports" className={tabClass}>
          Reports
        </NavLink>
      )}
      {showSettingsMenu && (
        <NavMenu label="Settings" active={settingsActive}>
          {canSettings && (
            <NavLink to="/settings" className={itemClass}>
              Settings
            </NavLink>
          )}
          {canMasterdata && (
            <NavLink to="/masterdata" className={itemClass}>
              Masterdata
            </NavLink>
          )}
          {auth.isAdmin && (
            <NavLink to="/users" className={itemClass}>
              Users
            </NavLink>
          )}
        </NavMenu>
      )}
    </>
  );

  const mobileNav = (
    <>
      {showPayablesMenu && (
        <div className="mobile-nav-group">
          <div className="mobile-nav-label">Payables</div>
          {canPayables && (
            <NavLink to="/payables" end className={tabClass} onClick={closeMenu}>
              Payables
            </NavLink>
          )}
          {canRelease && (
            <NavLink to="/release" className={tabClass} onClick={closeMenu}>
              Upcoming Release
            </NavLink>
          )}
          {canSuppliers && (
            <NavLink to="/payables/suppliers" className={tabClass} onClick={closeMenu}>
              Suppliers
            </NavLink>
          )}
        </div>
      )}
      {canAr && (
        <div className="mobile-nav-group">
          <div className="mobile-nav-label">Receivables</div>
          <NavLink to="/receivables/details" className={tabClass} onClick={closeMenu}>
            Billing lines
          </NavLink>
          <NavLink to="/receivables/summary" className={tabClass} onClick={closeMenu}>
            Monthly summary
          </NavLink>
          <NavLink to="/receivables/clients" className={tabClass} onClick={closeMenu}>
            Clients
          </NavLink>
        </div>
      )}
      {canSourceAccounts && (
        <div className="mobile-nav-group">
          <div className="mobile-nav-label">Source Accounts</div>
          <NavLink to="/source-accounts" end className={tabClass} onClick={closeMenu}>
            Accounts
          </NavLink>
          <NavLink to="/source-accounts/deposit" className={tabClass} onClick={closeMenu}>
            Deposit
          </NavLink>
          <NavLink to="/source-accounts/withdrawal" className={tabClass} onClick={closeMenu}>
            Withdrawal
          </NavLink>
        </div>
      )}
      {auth.can('liquidations_view') && (
        <NavLink to="/liquidations" className={tabClass} onClick={closeMenu}>
          Liquidations
        </NavLink>
      )}
      {auth.can('petty_cash_view') && (
        <NavLink to="/petty-cash" className={tabClass} onClick={closeMenu}>
          Petty Cash
        </NavLink>
      )}
      {auth.isAdmin && (
        <NavLink to="/reports" className={tabClass} onClick={closeMenu}>
          Reports
        </NavLink>
      )}
      {showSettingsMenu && (
        <div className="mobile-nav-group">
          <div className="mobile-nav-label">Settings</div>
          {canSettings && (
            <NavLink to="/settings" className={tabClass} onClick={closeMenu}>
              Settings
            </NavLink>
          )}
          {canMasterdata && (
            <NavLink to="/masterdata" className={tabClass} onClick={closeMenu}>
              Masterdata
            </NavLink>
          )}
          {auth.isAdmin && (
            <NavLink to="/users" className={tabClass} onClick={closeMenu}>
              Users
            </NavLink>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="app">
      <header ref={topbarRef} className={`topbar no-print${menuOpen ? ' menu-open' : ''}`}>
        <div className="topbar-main">
          <div className="brand">
            <BrandMark size="sm" />
          </div>
          <nav className="tabs tabs-desktop" aria-label="Main">
            {desktopNav}
            <NotificationBell />
          </nav>
          <div className="topbar-user">
            <div className="topbar-notif-mobile">
              <NotificationBell />
            </div>
            <UserMenu displayName={auth.user?.display_name ?? 'Account'} />
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="nav-toggle-bar" />
              <span className="nav-toggle-bar" />
              <span className="nav-toggle-bar" />
            </button>
          </div>
        </div>
        <nav
          id="mobile-nav"
          className={`tabs tabs-mobile${menuOpen ? ' open' : ''}`}
          aria-label="Main mobile"
          aria-hidden={!menuOpen}
        >
          {mobileNav}
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to={home} replace />} />
          <Route
            path="/payables"
            element={
              <LedgerProvider ledger={payableLedger}>
                <RequirePerm perm="payables_view">
                  <PayablesPage />
                </RequirePerm>
              </LedgerProvider>
            }
          />
          <Route
            path="/payables/new"
            element={
              <LedgerProvider ledger={payableLedger}>
                <RequirePerm perm="payables_create">
                  <PayableFormPage />
                </RequirePerm>
              </LedgerProvider>
            }
          />
          <Route
            path="/payables/suppliers"
            element={
              <RequireAnyPerm perms={['suppliers']}>
                <SuppliersPage />
              </RequireAnyPerm>
            }
          />
          <Route
            path="/payables/:id"
            element={
              <LedgerProvider ledger={payableLedger}>
                <RequirePerm perm="payables_edit">
                  <PayableFormPage />
                </RequirePerm>
              </LedgerProvider>
            }
          />
          <Route path="/receivables" element={<Navigate to="/receivables/details" replace />} />
          <Route
            path="/receivables/details"
            element={
              <RequireAr>
                <ReceivablesBillingPage mode="details" />
              </RequireAr>
            }
          />
          <Route
            path="/receivables/summary"
            element={
              <RequireAr>
                <ReceivablesBillingPage mode="summary" />
              </RequireAr>
            }
          />
          <Route
            path="/receivables/clients"
            element={
              <RequireAr>
                <ArClientsPage />
              </RequireAr>
            }
          />
          <Route
            path="/release"
            element={
              <LedgerProvider ledger={payableLedger}>
                <RequirePerm perm="upcoming_release">
                  <UpcomingReleasePage />
                </RequirePerm>
              </LedgerProvider>
            }
          />
          <Route
            path="/source-accounts"
            element={
              <RequireAnyPerm perms={['source_accounts']}>
                <SourceAccountsPage mode="accounts" />
              </RequireAnyPerm>
            }
          />
          <Route
            path="/source-accounts/deposit"
            element={
              <RequireAnyPerm perms={['source_accounts']}>
                <SourceAccountsPage mode="deposit" />
              </RequireAnyPerm>
            }
          />
          <Route
            path="/source-accounts/withdrawal"
            element={
              <RequireAnyPerm perms={['source_accounts']}>
                <SourceAccountsPage mode="withdrawal" />
              </RequireAnyPerm>
            }
          />
          <Route
            path="/liquidations"
            element={
              <RequirePerm perm="liquidations_view">
                <LiquidationsPage />
              </RequirePerm>
            }
          />
          <Route
            path="/liquidations/:id"
            element={
              <RequirePerm perm="liquidations_view">
                <LiquidationDetailPage />
              </RequirePerm>
            }
          />
          <Route
            path="/petty-cash"
            element={
              <RequirePerm perm="petty_cash_view">
                <PettyCashPage />
              </RequirePerm>
            }
          />
          <Route
            path="/masterdata"
            element={
              <RequirePerm perm="masterdata">
                <MasterdataPage />
              </RequirePerm>
            }
          />
          <Route
            path="/settings"
            element={
              <RequirePerm perm="settings">
                <SettingsPage />
              </RequirePerm>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAdmin>
                <ReportsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/users"
            element={
              <RequireAdmin>
                <UsersPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      {auth.isAdmin && <AskAiPanel />}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
