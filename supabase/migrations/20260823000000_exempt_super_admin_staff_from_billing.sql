/*
# Exempt Super Admin staff from billing, not just Super Admin accounts

## Context
The billing bypass added earlier (usePlanInfo / RouteGuards) only exempts a user whose
OWN profile.system_role = 'super_admin'. It does not cover staff members who work under
a Super Admin — e.g. Nutro's own internal team, who have regular 'user' system_role but
belong to an organization owned by a Super Admin. Per instruction: "les super admin et
ses staffs ne paye aucun abonement" (Super Admins AND their staff never pay).

This is a role-based rule with no geography/currency component, so it already applies
uniformly regardless of country/branch — there is nothing here that is region-limited.

## Fix
Extend get_user_org_context() to also report whether the calling user's organization is
owned by a Super Admin (org_owner_is_super_admin). The frontend (usePlanInfo) then treats
that the same as being a Super Admin themselves for billing purposes, while every other
authorization check (RLS, is_super_admin()) is untouched — this only affects the billing
gate, not data access permissions.
*/

CREATE OR REPLACE FUNCTION public.get_user_org_context()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'org', o.id,
    'org_name', o.name,
    'plan', o.plan,
    'plan_status', o.plan_status,
    'trial_ends_at', o.trial_ends_at,
    'branch', b.id,
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
