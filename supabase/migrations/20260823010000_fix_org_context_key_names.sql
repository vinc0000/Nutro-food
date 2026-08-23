/*
# Fix get_user_org_context() key mismatch (org/branch -> org_id/branch_id)

## Problem
get_user_org_context() has returned jsonb keys 'org' and 'branch' for the org/branch
id since it was first created. But every frontend consumer — the OrgContext
TypeScript interface, the demo-mode mock RPC, and every page that reads
orgContext.org_id / orgContext.branch_id (Dashboard, Settings, PosSecurityTab) —
expects the keys 'org_id' and 'branch_id'.

In demo/local mode this went unnoticed because the mock RPC in src/lib/supabase.ts
was written independently and already used the correct key names. Only the real
Supabase RPC had the mismatch. The practical effect in production: orgContext.org_id
and orgContext.branch_id were always `undefined`, which silently broke:
  - AdminDashboard: bails out immediately (`if (!orgContext?.branch_id) return;`),
    so the dashboard never loaded real stats.
  - Settings: tenant_org_id sent to the billing edge function was always undefined.
  - PosSecurityTab: branchId was always null, so the PIN configured/save flow never
    actually reached a branch (this is the same symptom the 2026-08-22 fix addressed
    from the *frontend* side — this migration fixes the real root cause on the
    *backend* side).

## Fix
Rename the two keys. Everything else about this function is unchanged.
*/

CREATE OR REPLACE FUNCTION public.get_user_org_context()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'org_id', o.id,
    'org_name', o.name,
    'plan', o.plan,
    'plan_status', o.plan_status,
    'trial_ends_at', o.trial_ends_at,
    'branch_id', b.id,
    'branch_name', b.name,
    'currency', b.currency,
    'country', b.country,
    'city', b.city,
    'role', uor.role_name,
    'permissions', uor.permissions,
    'org_owner_is_super_admin', public.is_super_admin(o.owner_id)
  )
  FROM organizations o
  JOIN user_org_roles uor ON uor.org_id = o.id AND uor.user_id = auth.uid()
  LEFT JOIN branches b ON b.org_id = o.id
  WHERE uor.user_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_org_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_org_context() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_org_context() TO authenticated;
