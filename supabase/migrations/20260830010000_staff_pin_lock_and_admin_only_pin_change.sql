/*
# Per-staff PIN identity at the POS: lock/unlock + step-up auth

## The gap this fixes
The POS only ever knew "whichever Supabase Auth session is logged into this
browser" (profile.id) as the acting cashier — there was no way for an
individual staff member sharing a till to identify themselves by their own
staff_code + PIN, distinct from the browser's login session. Without that,
"a staff member can lock/unlock their own account" has no account to attach
to at the POS.

## What this adds
- profiles.pos_locked_at (nullable timestamptz): when set, that person cannot
  process a POS transaction until they unlock again with their PIN.
- identify_staff_by_pin(staff_code, pin): resolves the caller's own org (via
  auth.uid(), same as everywhere else), finds the active membership with that
  staff_code, verifies the PIN against profiles.pin_hash, and returns who they
  are + their current lock state. This becomes "the active staff for this POS
  shift" client-side — a lightweight identity layer, not a second Supabase Auth
  session.
- set_staff_lock(staff_code, pin, lock): locking needs no PIN (tap to step
  away); unlocking requires the correct PIN, matching "il lock son compte de
  meme comme il peut le ouvrir en mettant son code" — locking is the low-stakes
  action, unlocking is the one that proves identity.
- set_staff_pin() is now admin-only: previously a person could reset their own
  PIN too (p_target_user_id = auth.uid() was allowed); that self-service path
  is removed so only an owner/org_owner/branch_manager can set a staff PIN,
  matching "seul admin peut changer les codes des staff" exactly. Locking/
  unlocking with an existing PIN is a different action from changing it, and
  stays available to the staff member themselves via set_staff_lock above.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pos_locked_at timestamptz;

CREATE OR REPLACE FUNCTION public.identify_staff_by_pin(p_staff_code text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id uuid;
  v_row record;
BEGIN
  SELECT org_id INTO v_org_id FROM public.user_org_roles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No organization context');
  END IF;

  SELECT uor.user_id, uor.role_name, p.full_name, p.pin_hash, p.pos_locked_at
    INTO v_row
    FROM public.user_org_roles uor
    JOIN public.profiles p ON p.id = uor.user_id
    WHERE uor.org_id = v_org_id AND uor.staff_code = p_staff_code AND uor.is_active = true
    LIMIT 1;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff code not found');
  END IF;
  IF v_row.pin_hash IS NULL OR v_row.pin_hash != extensions.crypt(p_pin, v_row.pin_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect PIN');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_row.user_id,
    'full_name', v_row.full_name,
    'role_name', v_row.role_name,
    'locked', v_row.pos_locked_at IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.identify_staff_by_pin(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.identify_staff_by_pin(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.identify_staff_by_pin(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_staff_lock(p_staff_code text, p_pin text, p_lock boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id uuid;
  v_row record;
BEGIN
  SELECT org_id INTO v_org_id FROM public.user_org_roles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No organization context');
  END IF;

  SELECT uor.user_id, p.pin_hash
    INTO v_row
    FROM public.user_org_roles uor
    JOIN public.profiles p ON p.id = uor.user_id
    WHERE uor.org_id = v_org_id AND uor.staff_code = p_staff_code AND uor.is_active = true
    LIMIT 1;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff code not found');
  END IF;

  -- Unlocking proves it's really them; locking is a low-stakes "stepping away"
  -- action that doesn't need to re-prove identity.
  IF NOT p_lock THEN
    IF v_row.pin_hash IS NULL OR v_row.pin_hash != extensions.crypt(p_pin, v_row.pin_hash) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Incorrect PIN');
    END IF;
  END IF;

  UPDATE public.profiles
  SET pos_locked_at = CASE WHEN p_lock THEN now() ELSE NULL END
  WHERE id = v_row.user_id;

  RETURN jsonb_build_object('success', true, 'locked', p_lock);
END;
$$;

REVOKE ALL ON FUNCTION public.set_staff_lock(text, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_staff_lock(text, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_staff_lock(text, text, boolean) TO authenticated;

-- Restrict set_staff_pin to admins only — the self-service branch
-- (p_target_user_id = auth.uid()) is removed. Locking/unlocking with an
-- existing PIN (above) is a separate, still staff-available action.
CREATE OR REPLACE FUNCTION public.set_staff_pin(p_target_user_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 8 THEN
    RETURN false;
  END IF;

  IF NOT public.is_super_admin(auth.uid())
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_org_roles caller
       JOIN public.user_org_roles target ON target.org_id = caller.org_id
       WHERE caller.user_id = auth.uid()
         AND caller.is_active = true
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
$function$;
