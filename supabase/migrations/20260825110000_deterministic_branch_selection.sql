/*
# get_user_org_context() picked an unpredictable branch for multi-branch orgs

## The bug
For an org with more than one branch, get_user_org_context()'s
LEFT JOIN branches b ON b.org_id = o.id produces one row per branch, and the
query only has ORDER BY o.created_at DESC LIMIT 1 — no ordering on the branch
side at all. Postgres makes no guarantee about which of the tied rows a LIMIT
without a full ORDER BY returns, so which branch a multi-branch org's staff
land on could differ between logins, page reloads, or even two requests
seconds apart. That's not just "always the wrong branch" (which would at
least be a consistent, obviously-wrong bug to notice) — it's silently
inconsistent, which is worse: staff could be looking at last week's data for
branch B while believing they're on branch A, with no error and no way to
tell from the UI.

## The fix (narrow, on purpose)
Add ORDER BY b.created_at ASC so the same branch — the first one set up —
is always returned deterministically. This does not add branch switching;
there is still no UI anywhere to select among an org's branches (multi_branch
is a listed premium feature with no corresponding switcher built yet). That's
a real, larger feature gap worth flagging, not something to build silently as
part of a bug-fix pass. This migration only makes today's single-branch
behavior stable and predictable instead of non-deterministic.
*/

CREATE OR REPLACE FUNCTION public.get_user_org_context()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'org_id', o.id,
    'org_name', o.name,
    'plan', o.plan,
    'plan_status', o.plan_status,
    'trial_ends_at', o.trial_ends_at,
    'branch_id', b.id,
    'branch_name', b.name,
    'currency', b.currency,
    'country', b.country,
    'city', b.city,
    'role', uor.role_name,
    'permissions', uor.permissions,
    'org_owner_is_super_admin', public.is_super_admin(o.owner_id)
  )
  FROM organizations o
  JOIN user_org_roles uor ON uor.org_id = o.id AND uor.user_id = auth.uid() AND uor.is_active = true
  LEFT JOIN branches b ON b.org_id = o.id
  WHERE uor.user_id = auth.uid()
  ORDER BY o.created_at DESC, b.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_org_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_org_context() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_org_context() TO authenticated;
