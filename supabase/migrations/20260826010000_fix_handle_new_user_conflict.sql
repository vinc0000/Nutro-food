/*
# Fix: handle_new_user() lost its ON CONFLICT protection

20260825050000_grant_super_admin_owner_emails.sql replaced handle_new_user() to add
the email-based super_admin grant, but its CREATE OR REPLACE dropped the
`ON CONFLICT (id) DO NOTHING` clause the original (20260701000000) had. Without it, if
this AFTER INSERT trigger on auth.users ever fires more than once for the same user
id — which can happen with Supabase's email-confirmation / magic-link / retry flows —
the second INSERT throws a unique-violation on profiles.id, and an AFTER trigger
failure aborts the whole signup transaction. Restoring it, keeping the email-based
grant logic exactly as-is otherwise.
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
