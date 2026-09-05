/*
# Close a staff-management privilege escalation

## The bug
add_staff_member() correctly checks the NEW role being granted -- a
branch_manager can't hand out 'owner'/'org_owner' to someone else. But
update_staff_member() and remove_staff_member() only ever checked the caller's
own role against the NEW role/action, never the TARGET row's CURRENT role.

Concretely: a branch_manager calling
  update_staff_member(p_membership_id: <the real owner's membership>, p_role_name: 'cashier', p_is_active: true)
passes caller_can_manage_org_staff(org_id, false) — false because 'cashier'
isn't an owner-tier role — which only requires branch_manager level. Nothing
stopped it from being pointed at the actual owner's row. The same gap let a
branch_manager call remove_staff_member() on the owner's membership and
delete it outright, locking the real owner out of their own organization
entirely. Both were reachable directly via the RPC regardless of whatever the
Staff.tsx UI does or doesn't expose — client-side hiding was never the actual
authorization boundary here.

## Fix
Both functions now also check the TARGET's current role: modifying or
removing a membership row that is currently 'owner' or 'org_owner' requires
the caller to themselves be 'owner'/'org_owner' (or a super admin) --
mirroring the protection add_staff_member() already had for granting that
tier, applied symmetrically to editing/removing it.
*/

CREATE OR REPLACE FUNCTION public.update_staff_member(
  p_membership_id uuid,
  p_role_name text,
  p_is_active boolean
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_current_role text;
  v_is_owner_role boolean := p_role_name IN ('owner', 'org_owner');
BEGIN
  SELECT org_id, role_name INTO v_org_id, v_current_role FROM public.user_org_roles WHERE id = p_membership_id;
  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- Changing the role TO owner/org_owner, or touching a row that's CURRENTLY
  -- owner/org_owner (demoting/deactivating an existing owner), both require
  -- owner-tier access from the caller.
  IF NOT public.caller_can_manage_org_staff(v_org_id, v_is_owner_role OR v_current_role IN ('owner', 'org_owner')) THEN
    RAISE EXCEPTION 'not authorized to update staff for this organization';
  END IF;

  UPDATE public.user_org_roles
  SET role_name = p_role_name, is_active = p_is_active
  WHERE id = p_membership_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_staff_member(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_staff_member(uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_staff_member(uuid, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_staff_member(p_membership_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_current_role text;
BEGIN
  SELECT org_id, role_name INTO v_org_id, v_current_role FROM public.user_org_roles WHERE id = p_membership_id;
  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.caller_can_manage_org_staff(v_org_id, v_current_role IN ('owner', 'org_owner')) THEN
    RAISE EXCEPTION 'not authorized to remove staff from this organization';
  END IF;

  DELETE FROM public.user_org_roles WHERE id = p_membership_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_staff_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_staff_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.remove_staff_member(uuid) TO authenticated;
