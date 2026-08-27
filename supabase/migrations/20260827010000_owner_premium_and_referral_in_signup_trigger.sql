/*
# Two gaps left by moving tenant provisioning into handle_new_user()

20260827000000 (parallel fix, landed after this branch started) moved tenant
provisioning from a client-side create_tenant() RPC call into handle_new_user()
itself, to fix new signups failing entirely when email confirmation is required.
Necessary and correct fix, but its version of the provisioning block is a plain
copy of the org-creation logic and doesn't carry two things the RPC version here
had already gained:

1. The owner-account premium override (20260825100000 / 20260825120000): orgs
   created by vincentnogue@yahoo.com, vincentnogue2@gmail.com, webdxb1@gmail.com
   should start on plan='premium'/status='active' with no trial, not the default
   trial/14-days every other signup gets.
2. referral_code capture (this branch): a sales rep's ?ref=<code> link needs to
   reach organizations.referral_code for commission tracking (SalesReps.tsx) to
   have anything real to match against, validated against an actual
   sales_reps.referral_code so a mistyped/unknown ref doesn't sit there looking
   valid.

SignupPage.tsx already passes referral_code through raw_user_meta_data (same
mechanism as org_name/plan/etc — see AuthContext.tsx's signUp). This migration
only needs to update the trigger to read it and apply both pieces of logic.
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
  v_is_owner_account boolean;
  v_plan text;
  v_plan_status text;
  v_trial_ends_at timestamptz;
  v_referral_code text;
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

  v_org_name := NEW.raw_user_meta_data->>'org_name';
  IF v_org_name IS NOT NULL AND v_org_name <> '' THEN
    v_is_owner_account := lower(NEW.email) IN ('vincentnogue@yahoo.com', 'vincentnogue2@gmail.com', 'webdxb1@gmail.com');
    v_plan := CASE WHEN v_is_owner_account THEN 'premium' ELSE COALESCE(NEW.raw_user_meta_data->>'plan', 'trial') END;
    v_plan_status := CASE WHEN v_is_owner_account THEN 'active' ELSE 'trial' END;
    v_trial_ends_at := CASE WHEN v_is_owner_account THEN NULL ELSE now() + interval '14 days' END;

    -- Only keep the referral code if it actually matches a real sales rep — an
    -- unrecognized or mistyped ?ref= value shouldn't silently sit in the column
    -- looking like a valid, trackable referral.
    SELECT referral_code INTO v_referral_code
    FROM public.sales_reps
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';

    v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug) || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);

    INSERT INTO organizations (name, slug, plan, plan_status, trial_ends_at, billing_email, owner_id, referral_code)
    VALUES (
      v_org_name,
      v_slug,
      v_plan,
      v_plan_status,
      v_trial_ends_at,
      NEW.email,
      NEW.id,
      v_referral_code
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
