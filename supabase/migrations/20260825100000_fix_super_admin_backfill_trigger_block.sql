/*
# Fix: the super_admin backfill in 20260825050000 was silently blocked

## Root cause
20260822120100_secure_profiles_rls.sql added a trigger, prevent_self_role_escalation,
that raises an exception on ANY change to profiles.system_role unless the caller
already is_super_admin(auth.uid()). It exists to stop a regular user from granting
themselves admin via their own "update own profile" permission — a real, correct
protection for normal app usage.

But 20260825050000_grant_super_admin_owner_emails.sql's backfill:

  UPDATE public.profiles SET system_role = 'super_admin' WHERE lower(email) IN (...);

...runs as a plain SQL statement during migration execution, not inside an
authenticated PostgREST/Supabase Auth session. auth.uid() has no session to read and
returns NULL in that context, so is_super_admin(NULL) is false, and the trigger's
own protection fired against it: the UPDATE raised 'Only a super admin can change
system_role' and failed. Since a migration file runs as one transaction, that
failure rolled back everything else in the same file too — including the
handle_new_user() redefinition — which is exactly why applying that migration
appeared to do nothing: promoting already-existing accounts for these three emails
never actually took effect, and the fix for future signups didn't either.

(New signups going forward were never at risk from this specific issue — the
trigger only fires on UPDATE, and handle_new_user() creates the profile row via
INSERT — but since the whole migration rolled back, that INSERT-time fix rolled
back too.)

## The fix
Re-declare handle_new_user() again (safe, idempotent, no trigger involved), and
run the backfill UPDATE with the self-escalation trigger disabled for just that
one statement, in its own explicit block, so it can't be blocked by its own
protection mechanism.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, system_role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN lower(NEW.email) IN ('vincentnogue@yahoo.com', 'vincentnogue2@gmail.com', 'webdxb1@gmail.com')
        THEN 'super_admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles DISABLE TRIGGER trg_prevent_self_role_escalation;

UPDATE public.profiles
SET system_role = 'super_admin'
WHERE lower(email) IN ('vincentnogue@yahoo.com', 'vincentnogue2@gmail.com', 'webdxb1@gmail.com')
  AND system_role != 'super_admin';

ALTER TABLE public.profiles ENABLE TRIGGER trg_prevent_self_role_escalation;

-- Operating internationally means multi-branch (a premium-tier feature per
-- PLAN_FEATURES in useOrgContext.ts), so any org owned by one of these three
-- accounts should carry the premium plan — not just the unconditional access
-- usePlanInfo already grants a super admin regardless of the nominal plan
-- value, but the value itself should be accurate rather than misleadingly
-- showing 'trial'/'starter' in the UI (Dashboard/Settings both display it).
UPDATE public.organizations
SET plan = 'premium'
WHERE owner_id IN (SELECT id FROM public.profiles WHERE lower(email) IN ('vincentnogue@yahoo.com', 'vincentnogue2@gmail.com', 'webdxb1@gmail.com'))
  AND plan != 'premium';

-- Same treatment going forward: if one of these three ever creates a new org (or a
-- second branch network under a new org), it should start on premium/active rather
-- than trial/starter — consistent with the backfill above, not just a one-time fix.
CREATE OR REPLACE FUNCTION public.create_tenant(
  p_org_name text,
  p_plan text DEFAULT 'trial',
  p_billing_email text DEFAULT NULL,
  p_branch_name text DEFAULT 'Main Branch',
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_currency text DEFAULT 'USD',
  p_timezone text DEFAULT 'UTC',
  p_language text DEFAULT 'en'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_branch_id uuid;
  v_slug text;
  v_owner_perms jsonb;
  v_caller_email text;
  v_is_owner_account boolean;
  v_plan text;
  v_plan_status text;
  v_trial_ends_at timestamptz;
BEGIN
  SELECT lower(email) INTO v_caller_email FROM profiles WHERE id = auth.uid();
  v_is_owner_account := v_caller_email IN ('vincentnogue@yahoo.com', 'vincentnogue2@gmail.com', 'webdxb1@gmail.com');

  v_plan := CASE WHEN v_is_owner_account THEN 'premium' ELSE p_plan END;
  v_plan_status := CASE WHEN v_is_owner_account THEN 'active' ELSE 'trial' END;
  v_trial_ends_at := CASE WHEN v_is_owner_account THEN NULL ELSE now() + interval '14 days' END;

  v_slug := lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug) || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);

  INSERT INTO organizations (name, slug, plan, plan_status, trial_ends_at, billing_email, owner_id)
  VALUES (
    p_org_name,
    v_slug,
    v_plan,
    v_plan_status,
    v_trial_ends_at,
    COALESCE(p_billing_email, (SELECT email FROM profiles WHERE id = auth.uid())),
    auth.uid()
  )
  RETURNING id INTO v_org_id;

  INSERT INTO branches (org_id, name, country, city, currency, timezone, is_active)
  VALUES (v_org_id, p_branch_name, p_country, p_city, p_currency, p_timezone, true)
  RETURNING id INTO v_branch_id;

  v_owner_perms := jsonb_build_object(
    'menu', jsonb_build_array('read', 'write', 'delete'),
    'orders', jsonb_build_array('read', 'write', 'delete'),
    'reports', jsonb_build_array('read', 'write', 'delete'),
    'staff', jsonb_build_array('read', 'write', 'delete'),
    'settings', jsonb_build_array('read', 'write', 'delete'),
    'pos', jsonb_build_array('read', 'write', 'delete'),
    'kds', jsonb_build_array('read', 'write', 'delete'),
    'tables', jsonb_build_array('read', 'write', 'delete'),
    'inventory', jsonb_build_array('read', 'write', 'delete')
  );

  INSERT INTO user_org_roles (user_id, org_id, role_name, permissions)
  VALUES (auth.uid(), v_org_id, 'owner', v_owner_perms);

  RETURN jsonb_build_object(
    'org_id', v_org_id,
    'branch_id', v_branch_id,
    'slug', v_slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_tenant(text, text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_tenant(text, text, text, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_tenant(text, text, text, text, text, text, text, text, text) TO authenticated;
