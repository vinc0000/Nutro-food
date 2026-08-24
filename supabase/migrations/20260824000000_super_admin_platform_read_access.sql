/*
# Super admin platform-wide read access

## Why
The super-admin Financials page needs to see subscription revenue across every tenant
on the platform, but subscriptions' only policy (from 20260804091530) scopes SELECT to
"members of that org" with no super-admin exception — unlike organizations/branches/
profiles, which already got one in the foundational migrations. Without this, a
platform super admin querying subscriptions sees nothing outside their own org (if they
even have one), and the Financials page cannot show real numbers.
*/

DROP POLICY IF EXISTS "select_own_subscriptions" ON public.subscriptions;
CREATE POLICY "select_own_subscriptions" ON public.subscriptions FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND org_id = subscriptions.org_id)
  );
