/*
# Grant super_admin to specific platform-owner emails

## Purpose
Per instruction: vincentnogue@yahoo.com, vincentnogue2@gmail.com and
webdxb1@gmail.com must have working super admin access and never be billed —
regardless of whether they've already signed up or sign up later.

## What it does
1. Updates handle_new_user() (the trigger that creates a profiles row on
   signup) so that if the new account's email matches one of these three
   (case-insensitive), its profile is created with system_role =
   'super_admin' directly, instead of the normal default 'user'. Covers
   anyone signing up for the first time with one of these emails.
2. Backfills the same system_role for any of the three that already have a
   profile row (i.e. already signed up before this migration ran).

## Why this is enough on its own
- Super admin module access: is_super_admin() (used by every super-admin RLS
  policy and by RouteGuards.tsx client-side) checks exactly
  profiles.system_role = 'super_admin'. No other flag or table controls
  access to the super-admin module.
- No subscription billing: usePlanInfo already exempts any account whose own
  profile.system_role = 'super_admin' from every plan/trial/billing gate (see
  useOrgContext.ts) — this was true before this migration; it only needed
  these three emails to actually carry the role.

Nothing here touches RLS policies, is_super_admin() itself, or any other
authorization logic — only who is granted the pre-existing super_admin role.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  );
  RETURN NEW;
END;
$$;

-- Backfill: grant the role now to any of these three that already have an account.
UPDATE public.profiles
SET system_role = 'super_admin'
WHERE lower(email) IN ('vincentnogue@yahoo.com', 'vincentnogue2@gmail.com', 'webdxb1@gmail.com')
  AND system_role != 'super_admin';
