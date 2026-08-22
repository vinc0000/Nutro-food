import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';
import { usePlanInfo } from '@/hooks/useOrgContext';

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

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const { isTrialExpired, isSuspended, planStatus, loading: planLoading } = usePlanInfo();
  const location = useLocation();

  if (authLoading || planLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth/login" state={{ from: location }} replace />;

  const isSuperAdminUser = profile?.system_role === 'super_admin';

  const isBillingPage = location.pathname === '/app/admin/settings';
  const isExpired = isSuperAdminUser ? false : (isTrialExpired || (isSuspended && planStatus !== 'active'));

  if (isExpired && !isBillingPage) {
    return <Navigate to="/app/admin/settings" state={{ expiredAlert: true }} replace />;
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
