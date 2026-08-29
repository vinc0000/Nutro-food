-- "quand on cree un role, le systeme va creer son staff code et ladmin va cree le
-- code pour POS" — add a real, auto-generated staff_code to each membership, and let
-- add_staff_member set an initial POS PIN in the same step instead of requiring a
-- separate follow-up action.
ALTER TABLE public.user_org_roles ADD COLUMN IF NOT EXISTS staff_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_staff_code() RETURNS text
LANGUAGE plpgsql
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

-- Backfill a code for any existing membership that doesn't have one yet.
UPDATE public.user_org_roles SET staff_code = public.generate_staff_code() WHERE staff_code IS NULL;

CREATE OR REPLACE FUNCTION public.add_staff_member(
  p_org_id uuid,
  p_user_id uuid,
  p_role_name text,
  p_permissions jsonb DEFAULT '{}'::jsonb,
  p_pos_pin text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_is_owner_role boolean := p_role_name IN ('owner', 'org_owner');
  v_id uuid;
  v_staff_code text;
BEGIN
  IF NOT public.caller_can_manage_org_staff(p_org_id, v_is_owner_role) THEN
    RAISE EXCEPTION 'not authorized to add staff to this organization';
  END IF;

  v_staff_code := public.generate_staff_code();

  INSERT INTO public.user_org_roles (user_id, org_id, role_name, permissions, is_active, staff_code)
  VALUES (p_user_id, p_org_id, p_role_name, p_permissions, true, v_staff_code)
  RETURNING id INTO v_id;

  -- Set the staff's POS PIN in the same step, same real bcrypt hashing as
  -- set_staff_pin, rather than requiring a separate follow-up action.
  IF p_pos_pin IS NOT NULL AND length(p_pos_pin) >= 4 AND length(p_pos_pin) <= 8 THEN
    UPDATE public.profiles
    SET pin_hash = extensions.crypt(p_pos_pin, extensions.gen_salt('bf'))
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object('id', v_id, 'staff_code', v_staff_code);
END;
$$;

REVOKE ALL ON FUNCTION public.add_staff_member(uuid, uuid, text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_staff_member(uuid, uuid, text, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_staff_member(uuid, uuid, text, jsonb, text) TO authenticated;
