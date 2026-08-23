/*
# Staff management: is_active flag + safe PIN reset function

## Why
Staff.tsx currently runs entirely on a hardcoded in-memory array — none of it persists.
Wiring it to real data needs two small additions the initial schema didn't include:

1. `user_org_roles.is_active` — lets a manager deactivate a staff member's access
   without deleting their membership row (keeps history, can be re-enabled).
2. `set_staff_pin(p_target_user_id, p_pin)` — staff PIN (profiles.pin_hash) must never
   be set with a raw client-side UPDATE, both because it needs bcrypt hashing (see the
   POS PIN fix from 2026-08-22) and because a plain UPDATE on profiles would let any
   authenticated user overwrite ANYONE's pin_hash unless carefully scoped. This function
   restricts the caller to org managers/owners acting on a member of one of their own
   orgs, super admins, or a user resetting their own PIN.
*/

ALTER TABLE public.user_org_roles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.set_staff_pin(
  p_target_user_id uuid,
  p_pin text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 8 THEN
    RETURN false;
  END IF;

  IF p_target_user_id != auth.uid()
     AND NOT public.is_super_admin(auth.uid())
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_org_roles caller
       JOIN public.user_org_roles target ON target.org_id = caller.org_id
       WHERE caller.user_id = auth.uid()
         AND target.user_id = p_target_user_id
         AND caller.role_name IN ('owner', 'org_owner', 'branch_manager')
     )
  THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  WHERE id = p_target_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_staff_pin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_staff_pin(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_staff_pin(uuid, text) TO authenticated;
