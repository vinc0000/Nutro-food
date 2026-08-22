/*
# Secure RLS on public.profiles

## Problem
No migration in this repo creates policies for `public.profiles`, even though
`is_super_admin()` (added in 20260731185651_fix_rls_tenant_isolation.sql) depends on
reading `system_role` from it, and the app now performs client-side updates against it
(promoting/revoking Super Admins from /app/super-admin/admins). If RLS was never
locked down on this table directly in the live project, any authenticated user could
call the Supabase client from the browser console and set their own
`system_role = 'super_admin'`, bypassing every other check in the app.

## Fix
1. Enable RLS on profiles (idempotent).
2. A user can always read their own profile. Super admins can read every profile
   (needed for the admin-management screen).
3. A user can update their own profile (name, avatar, theme, etc). Super admins can
   update any profile.
4. A trigger blocks changes to `system_role` unless the caller already is a super
   admin — this is enforced independently of which UPDATE policy matched, so a
   regular user can never grant themselves elevated access even via their own
   "update own profile" permission.
*/

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT
  USING (id = auth.uid() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_super_admin" ON public.profiles;
CREATE POLICY "profiles_update_super_admin" ON public.profiles
  FOR UPDATE
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Belt-and-braces: even though only super admins can update *other* rows, a user's
-- own "update self" policy would otherwise let them rewrite system_role on their own
-- row too. This trigger blocks any system_role change unless the caller is already a
-- super admin, regardless of which policy allowed the UPDATE through.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.system_role IS DISTINCT FROM OLD.system_role AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only a super admin can change system_role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();
