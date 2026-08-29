/*
# Admin-configurable Z-report print limit

Was hardcoded to 2 in PosTerminal.tsx with no way for an admin to change it.
Adds branches.z_report_print_limit (default 2, matching the previous hardcoded
value so existing behavior doesn't change until an admin actually edits it),
and exposes it through get_user_org_context() so the POS terminal can read the
real, branch-specific value instead of a constant.
*/

ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS z_report_print_limit integer NOT NULL DEFAULT 2 CHECK (z_report_print_limit BETWEEN 1 AND 20);

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
    'z_report_print_limit', b.z_report_print_limit,
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
