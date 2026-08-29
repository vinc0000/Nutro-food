import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';
import { usePlanInfo, useModuleAccess, type ModuleKey } from '@/hooks/useOrgContext';

// Super admin access is granted exclusively through profile.system_role === 'super_admin',
// which is the same check enforced server-side by the is_super_admin() RLS helper in
// Supabase. Do NOT reintroduce a hardcoded email whitelist here: baking personal email
// addresses into the client bundle is a privacy leak (they end up public in the shipped
// JS and in git history) and it duplicates authorization logic that must live in the
// database, since that is the only place it can actually be enforced securely.

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="animate-spin w-10 h-10 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-primary)' }} />
    </div>
  );
}

// Maps a URL prefix to the module it belongs to, for real (not just cosmetic)
// role-based access control — a cashier or kitchen_staff account typing
// /app/admin/staff directly into the address bar is redirected away, not just kept
// from seeing the nav link for it.
function moduleForPath(pathname: string): ModuleKey | null {
  if (pathname === '/app/admin' || pathname === '/app/admin/') return 'dashboard';
  if (pathname.startsWith('/app/admin/menu')) return 'menu';
  if (pathname.startsWith('/app/admin/orders')) return 'orders';
  if (pathname.startsWith('/app/admin/reports')) return 'reports';
  if (pathname.startsWith('/app/admin/staff')) return 'staff';
  if (pathname.startsWith('/app/admin/integrations')) return 'integrations';
  if (pathname.startsWith('/app/admin/settings')) return 'settings';
  if (pathname.startsWith('/app/pos')) return 'pos';
  if (pathname.startsWith('/app/kds')) return 'kds';
  return null;
}

// Where to send someone away from a module they can't access — never a fixed path,
// since /app/admin itself is the 'dashboard' module and a cashier or kitchen_staff
// role doesn't have it, which would otherwise redirect straight into another block
// and loop forever. Picks the first module the role actually has, in a sensible
// priority order; a custom role with zero modules configured has nowhere safe to
// land, so it goes to login (better than an infinite loop or a blank screen).
function firstAccessiblePath(allowed: ModuleKey[]): string {
  const priority: Array<[ModuleKey, string]> = [
    ['dashboard', '/app/admin'],
    ['pos', '/app/pos'],
    ['kds', '/app/kds'],
    ['menu', '/app/admin/menu'],
    ['orders', '/app/admin/orders'],
    ['reports', '/app/admin/reports'],
    ['staff', '/app/admin/staff'],
    ['integrations', '/app/admin/integrations'],
    ['settings', '/app/admin/settings'],
  ];
  for (const [key, path] of priority) {
    if (allowed.includes(key)) return path;
  }
  return '/auth/login';
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const { isTrialExpired, isSuspended, planStatus, loading: planLoading } = usePlanInfo();
  const { allowed, can, loading: moduleLoading } = useModuleAccess();
  const location = useLocation();

  if (authLoading || planLoading || moduleLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth/login" state={{ from: location }} replace />;

  const isSuperAdminUser = profile?.system_role === 'super_admin';

  const isBillingPage = location.pathname === '/app/admin/settings';
  const isExpired = isSuperAdminUser ? false : (isTrialExpired || (isSuspended && planStatus !== 'active'));

  if (isExpired && !isBillingPage) {
    return <Navigate to="/app/admin/settings" state={{ expiredAlert: true }} replace />;
  }

  // The billing/settings page must stay reachable whenever isExpired sent someone
  // there above, even for a role that wouldn't otherwise have 'settings' access —
  // otherwise a cashier at an expired restaurant could bounce between "go to
  // settings" and "you can't access settings" with no way out. Super admins are
  // never module-restricted at all, matching their unrestricted status everywhere else.
  const module = moduleForPath(location.pathname);
  if (!isSuperAdminUser && !(isExpired && isBillingPage) && module && !can(module)) {
    return <Navigate to={firstAccessiblePath(allowed)} replace />;
  }

  return <>{children}</>;
}

export function SuperAdminGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/auth/login" replace />;

  const isSuperAdminRole = profile?.system_role === 'super_admin';

  if (!isSuperAdminRole) return <Navigate to="/app/admin" replace />;

  return <>{children}</>;
}

export function TabletGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function PublicOnlyGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) {
    if (profile?.system_role === 'super_admin')
      return <Navigate to="/app/super-admin" replace />;
    return <Navigate to="/app/admin" replace />;
  }
  return <>{children}</>;
}
