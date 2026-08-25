/*
# CRITICAL: new signups could completely fail to get platform access

## The bug
create_tenant() (called right after supabase.auth.signUp() from the client) creates
the organization/branch/owner role using auth.uid() to identify the new user. That
works ONLY if there is already an active session at the moment of the call.

If this Supabase project requires email confirmation before login — the default for
new Supabase projects — auth.signUp() returns a user record but NO session until the
user clicks the confirmation link in their email. The client then immediately calls
create_tenant() with no Authorization bearer token attached, auth.uid() resolves to
NULL inside the function, the INSERT into user_org_roles (user_id NOT NULL) fails, the
whole thing throws, and every single new signup hits AuthContext's catch block:
'Account created but setup incomplete. Please contact support.' — a dead end, not a
trial account.

## The fix
Move tenant provisioning into handle_new_user(), the AFTER INSERT trigger on
auth.users. Triggers run server-side with direct access to the new row — they need no
session, no auth.uid(), nothing from the client except what was passed in
raw_user_meta_data at signUp() time (which the client sets regardless of whether a
session is later granted). This makes new-tenant creation work identically whether
email confirmation is on or off.

The old create_tenant() RPC is left in place (harmless, no longer called by the
client normally) as a manual fallback super admins can use from SQL if a signup ever
needs to be provisioned by hand.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_name text;
  v_org_id uuid;
  v_branch_id uuid;
  v_slug text;
  v_owner_perms jsonb;
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
  )
  ON CONFLICT (id) DO NOTHING;

  -- If the signup form collected onboarding info, it's in raw_user_meta_data
  -- (options.data at signUp() time) — provision the tenant right here, with no
  -- dependency on a session existing yet.
  v_org_name := NEW.raw_user_meta_data->>'org_name';
  IF v_org_name IS NOT NULL AND v_org_name <> '' THEN
    v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug) || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);

    INSERT INTO organizations (name, slug, plan, plan_status, trial_ends_at, billing_email, owner_id)
    VALUES (
      v_org_name,
      v_slug,
      COALESCE(NEW.raw_user_meta_data->>'plan', 'trial'),
      'trial',
      now() + interval '14 days',
      NEW.email,
      NEW.id
    )
    RETURNING id INTO v_org_id;

    INSERT INTO branches (org_id, name, country, city, currency, timezone, is_active)
    VALUES (
      v_org_id,
      COALESCE(NEW.raw_user_meta_data->>'branch_name', 'Main Branch'),
      NEW.raw_user_meta_data->>'country',
      NEW.raw_user_meta_data->>'city',
      COALESCE(NEW.raw_user_meta_data->>'currency', 'USD'),
      COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC'),
      true
    )
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
    VALUES (NEW.id, v_org_id, 'owner', v_owner_perms);
  END IF;

  RETURN NEW;
END;
$$;
