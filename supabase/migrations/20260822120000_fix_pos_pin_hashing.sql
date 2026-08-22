/*
# Fix weak POS PIN hashing

## Problem
`set_branch_pos_pin` / `verify_branch_pos_pin` (added in
20260804091319_add_pos_pin_and_theme_update.sql) hashed PINs with
`md5(pin || 'nutro_salt_2024')`:
  - The salt is a single hardcoded string shared by every branch, which defeats the
    purpose of salting (identical PINs across branches produce identical hashes, and
    an attacker only needs to build one rainbow table for the whole platform).
  - MD5 is fast to compute, so brute-forcing a 4-6 digit numeric PIN takes a fraction
    of a second once the salt is known (and the salt is sitting in this file, which is
    world-readable in a public repo).

## Fix
Use pgcrypto's `crypt()` with `gen_salt('bf')` (bcrypt). Bcrypt embeds a unique random
salt in every generated hash and is deliberately slow, which is exactly what you want
for a low-entropy secret like a 4-6 digit PIN.

## Data migration
Existing `pos_pin_hash` values were produced with the old MD5 scheme and cannot be
converted to bcrypt without the original PIN (that's the point of hashing). This
migration clears existing hashes; affected branches must set a new POS PIN from
Settings after this migration runs.
*/

-- pgcrypto ships with Supabase Postgres; enabling it is idempotent and safe.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_branch_pos_pin(
  p_branch_id uuid,
  p_pin text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF p_pin IS NULL OR length(p_pin) < 4 THEN
    RETURN false;
  END IF;

  -- Verify the caller is a member of the org that owns this branch
  SELECT b.org_id INTO v_org_id FROM branches b WHERE b.id = p_branch_id;
  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = auth.uid() AND org_id = v_org_id
  ) THEN
    RETURN false;
  END IF;

  UPDATE branches
  SET pos_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  WHERE id = p_branch_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_branch_pos_pin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_branch_pos_pin(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_branch_pos_pin(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_branch_pos_pin(
  p_branch_id uuid,
  p_pin text
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM branches
    WHERE id = p_branch_id
    AND pos_pin_hash IS NOT NULL
    AND pos_pin_hash = extensions.crypt(p_pin, pos_pin_hash)
  );
$$;

REVOKE ALL ON FUNCTION public.verify_branch_pos_pin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_branch_pos_pin(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_branch_pos_pin(uuid, text) TO authenticated;

-- Old MD5 hashes are incompatible with the new scheme and cannot be upgraded without
-- the original PIN. Clear them so affected branches re-set a PIN via Settings.
UPDATE branches SET pos_pin_hash = NULL WHERE pos_pin_hash IS NOT NULL;
