import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';
import { usePlanInfo } from '@/hooks/useOrgContext';

export const SUPER_ADMIN_EMAILS = [
  'vincentnogue@yahoo.com',
  'vincentnogue2@gmail.com',
  'liyahjoha@gmail.com',
  'liyahjoha@yahoo.com',
];

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

  const email = user?.email?.toLowerCase() ?? '';
  const isSuperAdminUser = SUPER_ADMIN_EMAILS.includes(email) || profile?.system_role === 'super_admin';

  const isBillingPage = location.pathname === '/app/admin/settings';
  const isExpired = isSuperAdminUser ? false : (isTrialExpired || (isSuspended && planStatus !== 'active'));

  console.log("DEBUG GUARD:", { isTrialExpired, isSuspended, planStatus, isExpired, planLoading, path: location.pathname });

  if (isExpired && !isBillingPage) {
    return <Navigate to="/app/admin/settings" state={{ expiredAlert: true }} replace />;
  }

  return <>{children}</>;
}

export function SuperAdminGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/auth/login" replace />;

  const email = user.email?.toLowerCase() ?? '';
  const isWhitelisted = SUPER_ADMIN_EMAILS.includes(email);
  const isSuperAdminRole = profile?.system_role === 'super_admin';

  // Allow whitelisted emails OR users with super_admin system role
  if (!isWhitelisted && !isSuperAdminRole) return <Navigate to="/app/admin" replace />;

  return <>{children}</>;
}

export function TabletGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function PublicOnlyGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) {
    const email = user.email?.toLowerCase() ?? '';
    if (SUPER_ADMIN_EMAILS.includes(email) && profile?.system_role === 'super_admin')
      return <Navigate to="/app/super-admin" replace />;
    return <Navigate to="/app/admin" replace />;
  }
  return <>{children}</>;
}
