/*
# Trial length: 7 -> 14 days

New signups should get 14 days of full platform access before payment is required.
This is a faithful CREATE OR REPLACE of create_tenant() from
20260803191847_create_tenant_onboarding_function.sql, changing only
`interval '7 days'` to `interval '14 days'` — every parameter, permission set, and
the slug-generation logic are otherwise unchanged.

This only affects NEW signups. Existing orgs already mid-trial keep whatever
trial_ends_at they already have; use the Tenants page's 'Extend Trial' action if an
existing tenant needs more time.
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
  v_slug := lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug) || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);

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
