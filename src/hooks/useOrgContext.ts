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

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['pos', 'menu', 'orders', 'basic_reports', 'tables', 'kds', 'staff'],
  premium: ['pos', 'menu', 'orders', 'basic_reports', 'advanced_reports', 'tables', 'kds', 'staff', 'inventory', 'crm', 'multi_branch'],
  enterprise: ['pos', 'menu', 'orders', 'basic_reports', 'advanced_reports', 'tables', 'kds', 'staff', 'inventory', 'crm', 'multi_branch', 'white_label', 'api_access', 'advanced_analytics'],
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

  const isTrialActive = isSuperAdmin ? true : (planStatus === 'trial' && daysLeft > 0);
  const isTrialExpired = isSuperAdmin ? false : (planStatus === 'trial' && daysLeft === 0);
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
