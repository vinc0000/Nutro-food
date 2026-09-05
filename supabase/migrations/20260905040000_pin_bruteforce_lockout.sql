/*
# Close PIN brute-force gap + missing org check on verify_branch_pos_pin

## Problems found
1. verify_branch_pos_pin, identify_staff_by_pin, and set_staff_lock (the unlock
   path) all verify a 4-8 digit PIN with bcrypt but have NO rate limiting or
   lockout. Bcrypt is slow per-guess (~100ms) but that still allows roughly
   600 guesses/minute over the RPC endpoint -- a 4-digit PIN (10,000 possible
   values) is fully exhausted in under 20 minutes of unattended scripting.
   These PINs authorize real actions (processing POS sales/refunds under a
   specific staff member's identity), so this is a real impersonation risk,
   not just a login nuisance.
2. verify_branch_pos_pin additionally never checked that the caller is even a
   member of the org that owns the branch being targeted -- any authenticated
   user on the entire platform (e.g. a free-trial signup) could call it
   against an arbitrary branch_id. set_branch_pos_pin (setting the PIN) already
   had this check; verifying it did not, which was the more exposed direction.

## Fix
- branches.pos_pin_attempts / pos_pin_locked_until and profiles.pin_attempts /
  pin_locked_until track failed guesses. After 5 consecutive failures, the PIN
  is locked for 15 minutes regardless of further guesses (right or wrong) --
  this bounds the attempt rate to a level no realistic brute force can beat.
  A correct verification resets the counter to 0.
- verify_branch_pos_pin now requires the caller to be a member of the branch's
  org (same check already used by set_branch_pos_pin), and deliberately
  returns `false` for both "wrong PIN" and "locked out" (never leaks which)
  since this function is reachable by any authenticated platform user, not
  just this org's own staff on a shared device.
- identify_staff_by_pin / set_staff_lock can safely return a distinct "too many
  attempts" message, since only this org's own already-authenticated staff can
  reach them at all (their org membership is resolved from auth.uid(), not a
  caller-supplied id).
*/

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS pos_pin_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_pin_locked_until timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;

CREATE OR REPLACE FUNCTION public.verify_branch_pos_pin(
  p_branch_id uuid,
  p_pin text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id uuid;
  v_hash text;
  v_locked_until timestamptz;
  v_ok boolean;
BEGIN
  SELECT b.org_id, b.pos_pin_hash, b.pos_pin_locked_until
    INTO v_org_id, v_hash, v_locked_until
    FROM public.branches b WHERE b.id = p_branch_id;
  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- Previously missing entirely: verify_branch_pos_pin trusted any
  -- authenticated caller with the right branch_id, unlike set_branch_pos_pin.
  IF NOT EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = auth.uid() AND org_id = v_org_id AND is_active = true
  ) THEN
    RETURN false;
  END IF;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN false;
  END IF;

  v_ok := v_hash IS NOT NULL AND v_hash = extensions.crypt(p_pin, v_hash);

  IF v_ok THEN
    UPDATE public.branches SET pos_pin_attempts = 0, pos_pin_locked_until = NULL WHERE id = p_branch_id;
  ELSE
    UPDATE public.branches
    SET pos_pin_attempts = pos_pin_attempts + 1,
        pos_pin_locked_until = CASE WHEN pos_pin_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE pos_pin_locked_until END
    WHERE id = p_branch_id;
  END IF;

  RETURN v_ok;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_branch_pos_pin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_branch_pos_pin(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_branch_pos_pin(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.identify_staff_by_pin(p_staff_code text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id uuid;
  v_row record;
  v_ok boolean;
BEGIN
  SELECT org_id INTO v_org_id FROM public.user_org_roles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No organization context');
  END IF;

  SELECT uor.user_id, uor.role_name, p.full_name, p.pin_hash, p.pos_locked_at, p.pin_locked_until, p.pin_attempts
    INTO v_row
    FROM public.user_org_roles uor
    JOIN public.profiles p ON p.id = uor.user_id
    WHERE uor.org_id = v_org_id AND uor.staff_code = p_staff_code AND uor.is_active = true
    LIMIT 1;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff code not found');
  END IF;

  IF v_row.pin_locked_until IS NOT NULL AND v_row.pin_locked_until > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Try again in a few minutes.');
  END IF;

  v_ok := v_row.pin_hash IS NOT NULL AND v_row.pin_hash = extensions.crypt(p_pin, v_row.pin_hash);

  IF v_ok THEN
    UPDATE public.profiles SET pin_attempts = 0, pin_locked_until = NULL WHERE id = v_row.user_id;
  ELSE
    UPDATE public.profiles
    SET pin_attempts = pin_attempts + 1,
        pin_locked_until = CASE WHEN pin_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE pin_locked_until END
    WHERE id = v_row.user_id;
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
  v_ok boolean;
BEGIN
  SELECT org_id INTO v_org_id FROM public.user_org_roles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No organization context');
  END IF;

  SELECT uor.user_id, p.pin_hash, p.pin_locked_until, p.pin_attempts
    INTO v_row
    FROM public.user_org_roles uor
    JOIN public.profiles p ON p.id = uor.user_id
    WHERE uor.org_id = v_org_id AND uor.staff_code = p_staff_code AND uor.is_active = true
    LIMIT 1;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff code not found');
  END IF;

  -- Locking needs no PIN (tap to step away) — only the unlock path (proving
  -- identity) is rate-limited.
  IF NOT p_lock THEN
    IF v_row.pin_locked_until IS NOT NULL AND v_row.pin_locked_until > now() THEN
      RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Try again in a few minutes.');
    END IF;

    v_ok := v_row.pin_hash IS NOT NULL AND v_row.pin_hash = extensions.crypt(p_pin, v_row.pin_hash);

    IF v_ok THEN
      UPDATE public.profiles SET pin_attempts = 0, pin_locked_until = NULL WHERE id = v_row.user_id;
    ELSE
      UPDATE public.profiles
      SET pin_attempts = pin_attempts + 1,
          pin_locked_until = CASE WHEN pin_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE pin_locked_until END
      WHERE id = v_row.user_id;
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
