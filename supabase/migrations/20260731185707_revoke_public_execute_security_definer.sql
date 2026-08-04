/*
# Revoke public EXECUTE on SECURITY DEFINER functions

## Problem
The SECURITY DEFINER helper functions (is_super_admin, user_org_member, user_branch_member)
and the trigger function (handle_new_user) were callable by the `anon` role via the REST API.
This exposes internal authorization logic to unauthenticated users.

## Changes
1. REVOKE EXECUTE from public and anon on all SECURITY DEFINER functions
2. GRANT EXECUTE to authenticated only (RLS policies call these internally as the authenticated user)
3. handle_new_user: revoke from public/anon — it's only called by a trigger, not via API
*/

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_branch_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_branch_member(uuid, uuid) TO authenticated;
