-- The previous 4-arg add_staff_member(uuid, uuid, text, jsonb) is superseded by the
-- 5-arg version (adds p_pos_pin) from the migration just before this one. Leaving
-- both overloaded would let old cached clients silently skip staff_code/PIN setup.
DROP FUNCTION IF EXISTS public.add_staff_member(uuid, uuid, text, jsonb);
