/*
# Revoke EXECUTE on handle_new_user from authenticated

handle_new_user is a trigger function called only by the auth.users INSERT trigger.
It should not be callable via REST API by any role.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
