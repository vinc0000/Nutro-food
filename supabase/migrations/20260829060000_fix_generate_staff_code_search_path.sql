-- Security advisor flagged generate_staff_code() with a mutable search_path (WARN:
-- function_search_path_mutable). Pin it the same way the rest of this project's
-- SECURITY DEFINER-adjacent functions do, so it can't be tricked by a search_path
-- swap into resolving user_org_roles from a different schema.
CREATE OR REPLACE FUNCTION public.generate_staff_code() RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'STF-' || lpad((floor(random() * 100000))::text, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.user_org_roles WHERE staff_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$;
