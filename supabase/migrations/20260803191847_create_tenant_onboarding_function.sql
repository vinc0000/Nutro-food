/*
# Create tenant onboarding function

## Purpose
Creates a SECURITY DEFINER function `create_tenant` that atomically creates an organization,
a branch, and a user_org_roles membership row for the calling user during signup.
This solves the critical onboarding gap: after signUp, the user had no org/branch/role
and RLS blocked them from all tenant data.

## What it does
1. Inserts a row into `organizations` with the provided name, plan, and billing email.
   - Sets `plan` to the selected plan (e.g. 'starter', 'premium', 'enterprise')
   - Sets `plan_status` to 'trial'
   - `trial_ends_at` defaults to now() + 7 days (already in schema)
   - Sets `owner_id` to the calling user
   - Generates a slug from the org name
2. Inserts a row into `branches` with the provided location data.
   - Links to the new org
   - Sets country, city, currency, timezone
3. Inserts a row into `user_org_roles` making the user an 'owner' of the org.
   - Sets `permissions` to full owner permissions
4. Returns the org_id and branch_id

## Security
- SECURITY DEFINER so it can insert into user_org_roles (which has RLS)
- search_path = public to prevent injection
- Only callable by authenticated users
- Uses auth.uid() for owner_id — cannot impersonate another user
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
    now() + interval '7 days',
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

  -- Update profile theme_preference if language provided (future use)
  RETURN jsonb_build_object(
    'org_id', v_org_id,
    'branch_id', v_branch_id,
    'slug', v_slug
  );
END;
$$;

-- Grant execute to authenticated only
REVOKE ALL ON FUNCTION public.create_tenant(text, text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_tenant(text, text, text, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_tenant(text, text, text, text, text, text, text, text, text) TO authenticated;

-- Also add a function to check plan access for a given feature
CREATE OR REPLACE FUNCTION public.check_plan_access(
  p_feature text
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organizations o
    JOIN user_org_roles uor ON uor.org_id = o.id
    WHERE uor.user_id = auth.uid()
    AND o.plan_status IN ('trial', 'active')
    AND (
      -- During trial, all features are available
      o.plan_status = 'trial'
      OR
      -- After trial, check plan-based access
      (o.plan = 'enterprise') OR
      (o.plan = 'premium' AND p_feature NOT IN ('multi_branch', 'advanced_analytics', 'white_label')) OR
      (o.plan = 'starter' AND p_feature IN ('pos', 'menu', 'orders', 'basic_reports', 'tables', 'kds'))
    )
    LIMIT 1
  );
$$;

REVOKE ALL ON FUNCTION public.check_plan_access(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_plan_access(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_plan_access(text) TO authenticated;

-- Add a function to get the user's active org context
CREATE OR REPLACE FUNCTION public.get_user_org_context()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'org', o.id,
    'org_name', o.name,
    'plan', o.plan,
    'plan_status', o.plan_status,
    'trial_ends_at', o.trial_ends_at,
    'branch', b.id,
    'branch_name', b.name,
    'currency', b.currency,
    'country', b.country,
    'city', b.city,
    'role', uor.role_name,
    'permissions', uor.permissions
  )
  FROM organizations o
  JOIN user_org_roles uor ON uor.org_id = o.id AND uor.user_id = auth.uid()
  LEFT JOIN branches b ON b.org_id = o.id
  WHERE uor.user_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_org_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_org_context() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_org_context() TO authenticated;
