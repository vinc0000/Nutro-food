/*
# Extend free trial from 7 to 14 days

## Purpose
The product now advertises a 14-day free trial everywhere in the UI, but the only
place the trial length was actually enforced — the `create_tenant` onboarding
function, which sets `trial_ends_at` at signup time — was still hardcoded to 7
days. Every new organization was silently getting half the advertised trial.

## What it does
1. Recreates `create_tenant` with `trial_ends_at` set to `now() + interval '14 days'`.
   Recreated in full (not ALTERed) because trial length is a literal baked into the
   function body, not a parameter or column default.
2. Gives the `trial_ends_at` column itself a matching default, so any future direct
   insert into `organizations` (outside this function) also defaults to a real
   14-day trial instead of null.

## Not covered on purpose
This does NOT touch `trial_ends_at` on organizations that already exist — retroactively
extending an in-flight trial (or a lapsed one) is a billing decision, not a bug fix,
and should be a deliberate, reviewed data migration if it's wanted.
*/

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
BEGIN
  -- Generate slug from org name
  v_slug := lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug) || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);

  -- Insert organization
  INSERT INTO organizations (name, slug, plan, plan_status, trial_ends_at, billing_email, owner_id)
  VALUES (
    p_org_name,
    v_slug,
    p_plan,
    'trial',
    now() + interval '14 days',
    COALESCE(p_billing_email, (SELECT email FROM profiles WHERE id = auth.uid())),
    auth.uid()
  )
  RETURNING id INTO v_org_id;

  -- Insert branch
  INSERT INTO branches (org_id, name, country, city, currency, timezone, is_active)
  VALUES (v_org_id, p_branch_name, p_country, p_city, p_currency, p_timezone, true)
  RETURNING id INTO v_branch_id;

  -- Insert user_org_roles with owner permissions
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

-- Match the column default to the same 14-day trial for any future direct insert.
ALTER TABLE organizations ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '14 days');
