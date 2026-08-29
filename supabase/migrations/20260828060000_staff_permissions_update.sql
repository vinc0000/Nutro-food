/*
# Let update_staff_member also update permissions (Custom Role Builder)

## Why
update_staff_member(p_membership_id, p_role_name, p_is_active) only ever updated
role_name and is_active — there was no way to edit an already-assigned custom
role's module access after creation. Combined with the fact that nothing in the
frontend read user_org_roles.permissions at all until this change, the "Custom
Role Builder" section in Staff.tsx was a "Coming Soon" placeholder with nothing
real to build against.

## What this does
Adds an optional 4th parameter, p_permissions jsonb DEFAULT NULL. When NULL
(the default, so every existing caller keeps working unchanged), permissions
are left as they are. When provided, it replaces the membership's permissions —
this is what Staff.tsx's Edit Staff modal now calls when editing a custom
role's module checkboxes.
*/

-- CREATE OR REPLACE only replaces a function with the exact same parameter
-- signature — adding p_permissions creates a second, separate 3-arg-vs-4-arg
-- overload instead of replacing the old one, which Postgres then can't resolve
-- unambiguously when called with just the original 3 named arguments. Drop the
-- old signature explicitly first.
DROP FUNCTION IF EXISTS public.update_staff_member(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.update_staff_member(
  p_membership_id uuid,
  p_role_name text,
  p_is_active boolean,
  p_permissions jsonb DEFAULT NULL
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

  IF p_permissions IS NOT NULL THEN
    UPDATE public.user_org_roles
    SET role_name = p_role_name, is_active = p_is_active, permissions = p_permissions
    WHERE id = p_membership_id;
  ELSE
    UPDATE public.user_org_roles
    SET role_name = p_role_name, is_active = p_is_active
    WHERE id = p_membership_id;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.update_staff_member(uuid, text, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_staff_member(uuid, text, boolean, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_staff_member(uuid, text, boolean, jsonb) TO authenticated;
