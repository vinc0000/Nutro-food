import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface OrgContext {
  org_id: string;
  org_name: string;
  plan: string;
  plan_status: string;
  trial_ends_at: string | null;
  branch_id: string | null;
  branch_name: string | null;
  currency: string;
  country: string | null;
  city: string | null;
  role: string;
  permissions: Record<string, string[]> | null;
  // True when this org's owner is a platform Super Admin (e.g. Nutro's own internal
  // team). Staff in such an org never pay for a subscription, same as the Super Admin
  // account itself — see usePlanInfo below.
  org_owner_is_super_admin?: boolean;
}

export interface PlanInfo {
  plan: string;
  planStatus: string;
  trialEndsAt: Date | null;
  daysLeft: number;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isPlanActive: boolean;
  isSuspended: boolean;
  canAccess: (feature: string) => boolean;
}

export type ModuleKey = 'dashboard' | 'tablet' | 'menu' | 'pos' | 'kds' | 'orders' | 'reports' | 'staff' | 'integrations' | 'settings';

export const ALL_MODULES: ModuleKey[] = ['dashboard', 'tablet', 'menu', 'pos', 'kds', 'orders', 'reports', 'staff', 'integrations', 'settings'];

// Canonical module access per fixed role, derived from each role's already-documented
// permission list shown in Staff.tsx's roleConfig (e.g. branch_manager: "Menu edit,
// Staff manage, View reports, Approve refunds" -> menu/staff/reports/orders, plus pos
// since approving a refund happens at the POS). Owner/org_owner are intentionally
// absent — they always have full, unrestricted access, see useModuleAccess below.
// This is also the exact shape written to user_org_roles.permissions by
// addStaffMember()/saveEdit() in Staff.tsx, so a role's enforcement here and what's
// actually stored for it are always the same source of truth — a custom role is
// simply whatever module keys are present in its own stored permissions object.
export const ROLE_MODULE_ACCESS: Record<string, ModuleKey[]> = {
  branch_manager: ['dashboard', 'tablet', 'menu', 'pos', 'kds', 'orders', 'reports', 'staff'],
  cashier: ['pos', 'orders'],
  kitchen_staff: ['kds'],
  accountant: ['dashboard', 'reports'],
};

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['pos', 'menu', 'orders', 'basic_reports', 'tables', 'kds', 'staff'],
  premium: ['pos', 'menu', 'orders', 'basic_reports', 'advanced_reports', 'tables', 'kds', 'staff', 'inventory', 'crm', 'multi_branch', 'integrations'],
  enterprise: ['pos', 'menu', 'orders', 'basic_reports', 'advanced_reports', 'tables', 'kds', 'staff', 'inventory', 'crm', 'multi_branch', 'white_label', 'api_access', 'advanced_analytics', 'integrations'],
};

export function useOrgContext() {
  const { user } = useAuth();
  const [orgContext, setOrgContext] = useState<OrgContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setOrgContext(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_user_org_context');
      if (rpcError) throw rpcError;
      setOrgContext(data as OrgContext | null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization');
      setOrgContext(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { orgContext, loading, error, refresh };
}

export function usePlanInfo(): PlanInfo & { loading: boolean; refresh: () => Promise<void> } {
  const { profile } = useAuth();
  const { orgContext, loading, refresh } = useOrgContext();

  const trialEndsAt = orgContext?.trial_ends_at ? new Date(orgContext.trial_ends_at) : null;
  const now = new Date();
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const planStatus = orgContext?.plan_status ?? 'trial';
  const plan = orgContext?.plan ?? 'trial';
  // Platform super admins run Nutro itself and never pay. Their staff — anyone
  // belonging to an org that a super admin owns — are exempt too (org_owner_is_super_admin,
  // from get_user_org_context). This is a role check, not tied to any country/branch/
  // currency, so it applies the same way everywhere.
  const isSuperAdmin = profile?.system_role === 'super_admin' || orgContext?.org_owner_is_super_admin === true;

  // A missing trial_ends_at — orgContext not loaded yet, or genuinely absent — must
  // never be read as "the trial already ran out". That's an absence of information,
  // not evidence of expiry: without this guard, daysLeft defaults to 0 above whenever
  // trialEndsAt is null, which made brand-new signups (and anyone whose org context
  // hadn't finished loading yet) see an immediately-expired trial and get shoved to
  // the billing page before their real 14 days had even started.
  const hasTrialDate = trialEndsAt !== null;
  const isTrialActive = isSuperAdmin ? true : (planStatus === 'trial' && hasTrialDate && daysLeft > 0);
  const isTrialExpired = isSuperAdmin ? false : (planStatus === 'trial' && hasTrialDate && daysLeft === 0);
  const isPlanActive = isSuperAdmin ? true : (planStatus === 'active');
  const isSuspended = isSuperAdmin ? false : (planStatus === 'suspended' || isTrialExpired);

  const canAccess = (feature: string): boolean => {
    if (isSuperAdmin) return true;
    if (isTrialActive) return true;
    if (isSuspended) return false;
    const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.starter;
    return features.includes(feature);
  };

  return {
    plan,
    planStatus,
    trialEndsAt,
    daysLeft,
    isTrialActive,
    isTrialExpired,
    isPlanActive,
    isSuspended,
    canAccess,
    loading,
    refresh,
  };
}

// Real, enforced module access — not cosmetic. Consumed by RouteGuards.tsx (blocks
// direct URL navigation to a module the role doesn't have, not just hiding the nav
// link) and AdminLayout (hides nav links the current role can't use). A 'custom' role
// is whatever module keys exist in its own stored permissions object, set by Staff.tsx's
// Custom Role Builder — so building that UI and enforcing access here are the same
// mechanism end to end, not a form that saves to a column nothing reads.
export function useModuleAccess(): { allowed: ModuleKey[]; can: (m: ModuleKey) => boolean; loading: boolean } {
  const { orgContext, loading } = useOrgContext();
  const role = orgContext?.role;
  const isOwner = role === 'owner' || role === 'org_owner';

  let allowed: ModuleKey[];
  if (isOwner) {
    allowed = ALL_MODULES;
  } else if (role === 'custom') {
    allowed = Object.keys(orgContext?.permissions ?? {}) as ModuleKey[];
  } else {
    allowed = ROLE_MODULE_ACCESS[role ?? ''] ?? [];
  }

  return { allowed, can: (m: ModuleKey) => allowed.includes(m), loading };
}

