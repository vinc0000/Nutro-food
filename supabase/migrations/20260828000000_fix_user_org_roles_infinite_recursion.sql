/*
# Fix: "infinite recursion detected in policy for relation user_org_roles"

## The bug
user_org_roles_select's own USING clause contained:

  EXISTS (SELECT 1 FROM user_org_roles self WHERE self.user_id = auth.uid()
          AND self.org_id = user_org_roles.org_id)

...a subquery against the exact same table the policy protects. Evaluating the
policy for any SELECT on user_org_roles required re-evaluating that same
subquery, which is itself gated by the same policy — Postgres detects this
self-reference and refuses with "infinite recursion detected in policy",
breaking every query anywhere in the app that touches user_org_roles
(directly or via get_user_org_context()/Dashboard/Staff/etc).

## The fix
Replace the raw self-referential subquery with user_org_member(auth.uid(),
org_id) — the SECURITY DEFINER helper already used elsewhere in this schema
for exactly this purpose. Its internal query runs as the function owner
(which has BYPASSRLS), so it isn't subject to this table's RLS at all,
breaking the recursion while keeping the same "can see teammates in my org"
behavior.
*/

DROP POLICY IF EXISTS "user_org_roles_select" ON public.user_org_roles;
CREATE POLICY "user_org_roles_select" ON public.user_org_roles
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR user_id = auth.uid()
    OR public.user_org_member(auth.uid(), org_id)
  );
