/*
# Fix: tablet_token was enumerable by any anonymous caller

## The bug
Migration 20260823030000 created `branch_public_info` as a view granting anon
SELECT on every column, including tablet_token, and relied on a code comment
telling the frontend to only ever request ('id,name,currency,country,city') and
never tablet_token — as the comment itself admits, that is a client-side
convention, not a security boundary. PostgREST lets any caller choose which
columns to select on any table/view they have grant access to, so anyone with
the public anon key (which ships in every Nutro frontend bundle and is not a
secret) could call:

  GET /rest/v1/branch_public_info?select=id,name,tablet_token

...with no filter at all, and get every active branch's tablet_token in a
single unauthenticated request. tablet_token is meant to work like a bearer
secret scoped to one physical tablet/QR code; a view that lets it be listed in
bulk defeats that regardless of what the app's own UI happens to request.

## The fix
Drop tablet_token from the publicly-selectable view entirely, and replace the
"resolve a branch from its token" lookup with a SECURITY DEFINER function that
takes the token as an input argument. You can only get a branch's public info
back if you already know its exact token — there is no longer any query shape
that lists tokens, so the token can no longer be enumerated, only presented.
*/

-- Recreate the view without tablet_token. Nothing else needs it: order
-- placement doesn't check it (see the orders_anon_insert policy — it only
-- requires branch_id + source='tablet'), it exists purely to resolve which
-- branch a QR-provisioned tablet belongs to, which is what the function below
-- now does instead.
CREATE OR REPLACE VIEW public.branch_public_info AS
SELECT id, name, currency, country, city
FROM public.branches
WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.resolve_branch_by_tablet_token(p_token text)
RETURNS TABLE (id uuid, name text, currency text, country text, city text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT b.id, b.name, b.currency, b.country, b.city
  FROM public.branches b
  WHERE b.tablet_token = p_token
    AND b.is_active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_branch_by_tablet_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_branch_by_tablet_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_branch_by_tablet_token(text) TO authenticated;
