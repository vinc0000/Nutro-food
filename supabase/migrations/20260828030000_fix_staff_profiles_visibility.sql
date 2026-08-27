/*
# Fix: Staff.tsx showed every teammate as "Unnamed" / "(no email)" except yourself

profiles_select only allowed id = auth.uid() OR is_super_admin() — so the per-row
profile lookup Staff.tsx does for each team member (user_org_roles -> profiles)
was silently RLS-filtered to nothing for anyone but the logged-in user themselves.

Fix: can also see a profile if that person shares an active org with you — same
tenant-isolation boundary as everywhere else (user_org_member's underlying logic,
inlined here since profiles isn't the same table user_org_member checks against),
not a broader leak across tenants.
*/

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_org_roles mine
      JOIN public.user_org_roles theirs ON theirs.org_id = mine.org_id
      WHERE mine.user_id = auth.uid() AND mine.is_active = true
        AND theirs.user_id = profiles.id AND theirs.is_active = true
    )
  );
