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

const DEMO_ORG_CONTEXT: OrgContext = {
  org_id: 'demo-org-id',
  org_name: 'Nutro Dubai',
  plan: 'premium',
  plan_status: 'trial',
  trial_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days remaining in trial
  branch_id: 'demo-branch-id',
  branch_name: 'Dubai Marina Branch',
  currency: 'USD',
  country: 'United Arab Emirates',
  city: 'Dubai',
  role: 'org_owner',
  permissions: null
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
    try {
      const { data, error: rpcError } = await supabase.rpc('get_user_org_context');
      if (rpcError) throw rpcError;
      setOrgContext((data || DEMO_ORG_CONTEXT) as OrgContext | null);
      setError(null);
    } catch (err) {
      console.warn("RPC get_user_org_context skipped or unavailable, falling back to rich demo organization context.");
      setError(null);
      setOrgContext(DEMO_ORG_CONTEXT);
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
  const { orgContext, loading, refresh } = useOrgContext();

  const trialEndsAt = orgContext?.trial_ends_at ? new Date(orgContext.trial_ends_at) : null;
  const now = new Date();
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const planStatus = orgContext?.plan_status ?? 'trial';
  const plan = orgContext?.plan ?? 'trial';

  const isTrialActive = planStatus === 'trial' && daysLeft > 0;
  const isTrialExpired = planStatus === 'trial' && daysLeft === 0;
  const isPlanActive = planStatus === 'active';
  const isSuspended = planStatus === 'suspended' || isTrialExpired;

  const canAccess = (feature: string): boolean => {
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
