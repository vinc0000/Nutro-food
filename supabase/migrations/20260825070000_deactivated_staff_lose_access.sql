/*
# Deactivating a staff member didn't actually revoke their access

## The bug
get_user_org_context() joins user_org_roles on (org_id, user_id) only — it never
checks is_active. Staff.tsx's deactivate toggle (and remove_staff_member's sibling,
update_staff_member, from the staff-management fix) sets is_active = false on that
row, intending to lock the person out. But this function — which every guarded page
calls via useOrgContext to get plan/branch/role — kept matching the row regardless,
so a deactivated staff member still got a full org context back and could keep
using the app exactly as before.

## The fix
Add `AND uor.is_active = true` to the join. A deactivated membership now falls
through to no matching org, which every guard already treats as "no access"
(AuthGuard/canAccess rely on orgContext being present).
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
  JOIN user_org_roles uor ON uor.org_id = o.id AND uor.user_id = auth.uid() AND uor.is_active = true
  LEFT JOIN branches b ON b.org_id = o.id
  WHERE uor.user_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_org_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_org_context() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_org_context() TO authenticated;
