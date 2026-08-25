/*
# Deactivated staff kept full data access everywhere, not just in the app UI

## The bug — much bigger than the previous fix
20260825070000 fixed get_user_org_context() (the app's own entry point) to stop
handing a working session to a deactivated staff member. But that only blocks the
*app UI* — anyone who still holds a valid Supabase Auth session (deactivating a
user_org_roles row does not revoke their JWT) can call the Supabase REST API
directly. And the actual data-access gate for virtually every tenant-scoped table
— branches, menu_items, orders, order_items, kds_tickets, floor_plans,
restaurant_tables, pos_sessions, and more, per 20260731185651's own stated list —
is not get_user_org_context at all. It's two helper functions,
user_org_member() and user_branch_member(), used throughout that migration's RLS
policies. Neither of them checked is_active either. So a deactivated staff member
could still read and write orders, menu items, branch settings, POS sessions —
essentially the entire tenant's operational data — for as long as their Supabase
session stayed valid, regardless of being deactivated.

The integrations table (20260824020000) has the same gap independently: its
select/write policies check role_name IN (...) membership directly, also without
is_active.

## The fix
Add `AND is_active = true` to both helper functions and to all three integrations
policies. Every table built on user_org_member/user_branch_member inherits the fix
automatically without needing to touch each one individually.
*/

CREATE OR REPLACE FUNCTION public.user_org_member(check_uid uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = check_uid AND org_id = check_org_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_branch_member(check_uid uuid, check_branch_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_org_roles uor
    JOIN public.branches b ON b.org_id = uor.org_id
    WHERE uor.user_id = check_uid
      AND uor.is_active = true
      AND (uor.branch_id = check_branch_id OR uor.branch_id IS NULL)
      AND b.id = check_branch_id
  );
$$;

DROP POLICY IF EXISTS "integrations_select" ON public.integrations;
CREATE POLICY "integrations_select" ON public.integrations
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid() AND org_id = integrations.org_id AND is_active = true
        AND role_name IN ('owner', 'org_owner', 'branch_manager')
    )
  );

DROP POLICY IF EXISTS "integrations_write" ON public.integrations;
CREATE POLICY "integrations_write" ON public.integrations
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid() AND org_id = integrations.org_id AND is_active = true
        AND role_name IN ('owner', 'org_owner', 'branch_manager')
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid() AND org_id = integrations.org_id AND is_active = true
        AND role_name IN ('owner', 'org_owner', 'branch_manager')
    )
  );
