/*
# Backfill: 3 accounts signed up before handle_new_user's org creation was fixed

## The bug behind "no restaurant is associated with this account" / "Could not find
## organization context for this user"

These 3 real (non-super-admin) accounts signed up before handle_new_user() was fixed
to actually create an organization/branch/owner role at signup — earlier iterations
either required a follow-up RPC call that needed a session that didn't exist (email
confirmation), or had other now-fixed issues. Each ended up with a valid login and a
profiles row, but zero organization — exactly why Menu, Integrations, and every other
tenant-facing page correctly reported having no restaurant to work with: there
genuinely wasn't one for these accounts, and the underlying data was telling the
truth. New signups going forward are unaffected (handle_new_user creates the org
correctly now, verified directly against the live database).

## The fix
One-time backfill creating a real organization + branch + owner role for every
non-super-admin account that doesn't have one, mirroring handle_new_user()'s own
logic exactly (same shape, same 14-day trial, same permission set) — not a shortcut
or fake row. Uses a placeholder name ("My Restaurant" / "Main Branch") each owner can
rename via Settings.

Verified end-to-end directly against the live database after this migration: creating
a menu category, a menu item, and connecting an integration all succeeded for one of
the backfilled accounts.
*/

DO $$
DECLARE
  v_user RECORD;
  v_org_id uuid;
  v_branch_id uuid;
  v_slug text;
  v_owner_perms jsonb;
BEGIN
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

  FOR v_user IN
    SELECT p.id, p.email
    FROM profiles p
    WHERE p.system_role != 'super_admin'
      AND NOT EXISTS (SELECT 1 FROM user_org_roles uor WHERE uor.user_id = p.id)
  LOOP
    v_slug := lower(regexp_replace(split_part(v_user.email, '@', 1), '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug) || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);

    INSERT INTO organizations (name, slug, plan, plan_status, trial_ends_at, billing_email, owner_id)
    VALUES ('My Restaurant', v_slug, 'trial', 'trial', now() + interval '14 days', v_user.email, v_user.id)
    RETURNING id INTO v_org_id;

    INSERT INTO branches (org_id, name, currency, timezone, is_active)
    VALUES (v_org_id, 'Main Branch', 'USD', 'UTC', true)
    RETURNING id INTO v_branch_id;

    INSERT INTO user_org_roles (user_id, org_id, role_name, permissions)
    VALUES (v_user.id, v_org_id, 'owner', v_owner_perms);
  END LOOP;
END $$;
