-- The Super Admin "extend" action could only ever extend trial_ends_at, which
-- only exists for orgs on plan_status = 'trial'. Once a tenant is upgraded to
-- an active paid plan, there was no column at all tracking when their paid
-- period ends -- so a super admin had no way to grant a paid customer extra
-- time (e.g. a goodwill extension, a manual renewal, a support gesture).
--
-- Add subscription_ends_at: used for active paid subscriptions the same way
-- trial_ends_at is used for trials. NULL means "no end date set" (legacy rows,
-- or plans not yet touched by the new extend flow) -- existing behavior for
-- rows that don't use it is unaffected.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

COMMENT ON COLUMN public.organizations.subscription_ends_at IS
  'End of the current paid billing period for active subscriptions. Set/extended by Super Admin > Tenants (add days/months/years or a custom date), or by payment webhooks on renewal. Distinct from trial_ends_at, which only applies while plan_status = trial.';

CREATE INDEX IF NOT EXISTS idx_organizations_subscription_ends_at
  ON public.organizations (subscription_ends_at)
  WHERE subscription_ends_at IS NOT NULL;
