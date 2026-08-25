/*
# Staff management was completely broken for real tenant admins

## The bug
user_org_roles_write RLS policy (20260701000000_create_core_schema.sql) is:

  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()))

...i.e. only a platform super admin can INSERT/UPDATE/DELETE rows in
user_org_roles directly — by design (that migration's own comment says writes
should go through "the create_tenant/invite functions"). But Staff.tsx's add
/ edit / delete / activate-toggle all issue plain
supabase.from('user_org_roles').insert/update/delete(...) calls straight from
the client. For any real tenant owner or branch manager (i.e. everyone who
isn't a super admin), every one of those calls is rejected by RLS. The whole
Staff page — invite, remove, change role, deactivate — silently doesn't work
outside super-admin accounts.

## The fix
Three SECURITY DEFINER functions, each checking the caller is themselves an
active owner/org_owner/branch_manager of the target org (or a super admin)
before touching user_org_roles — the same authorization Staff.tsx's UI already
assumes, just actually enforced server-side instead of relied on client-side.

Also closes a privilege-escalation gap that a naive "any manager can write
any row" function would have: only an existing owner/org_owner (or a super
admin) can grant the owner/org_owner role to someone else. A branch_manager
adding or editing staff can't hand out ownership.
*/

CREATE OR REPLACE FUNCTION public.caller_can_manage_org_staff(p_org_id uuid, p_allow_owner_grant boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF public.is_super_admin(auth.uid()) THEN
    RETURN true;
  END IF;

  SELECT role_name INTO v_role
  FROM public.user_org_roles
  WHERE user_id = auth.uid() AND org_id = p_org_id AND is_active = true
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF p_allow_owner_grant THEN
    RETURN v_role IN ('owner', 'org_owner');
  END IF;

  RETURN v_role IN ('owner', 'org_owner', 'branch_manager');
END;
$$;

REVOKE ALL ON FUNCTION public.caller_can_manage_org_staff(uuid, boolean) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.add_staff_member(
  p_org_id uuid,
  p_user_id uuid,
  p_role_name text,
  p_permissions jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner_role boolean := p_role_name IN ('owner', 'org_owner');
  v_id uuid;
BEGIN
  IF NOT public.caller_can_manage_org_staff(p_org_id, v_is_owner_role) THEN
    RAISE EXCEPTION 'not authorized to add staff to this organization';
  END IF;

  INSERT INTO public.user_org_roles (user_id, org_id, role_name, permissions, is_active)
  VALUES (p_user_id, p_org_id, p_role_name, p_permissions, true)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_staff_member(uuid, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_staff_member(uuid, uuid, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_staff_member(uuid, uuid, text, jsonb) TO authenticated;

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
  v_is_owner_role boolean := p_role_name IN ('owner', 'org_owner');
BEGIN
  SELECT org_id INTO v_org_id FROM public.user_org_roles WHERE id = p_membership_id;
  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.caller_can_manage_org_staff(v_org_id, v_is_owner_role) THEN
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
BEGIN
  SELECT org_id INTO v_org_id FROM public.user_org_roles WHERE id = p_membership_id;
  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.caller_can_manage_org_staff(v_org_id, false) THEN
    RAISE EXCEPTION 'not authorized to remove staff from this organization';
  END IF;

  DELETE FROM public.user_org_roles WHERE id = p_membership_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_staff_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_staff_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.remove_staff_member(uuid) TO authenticated;
