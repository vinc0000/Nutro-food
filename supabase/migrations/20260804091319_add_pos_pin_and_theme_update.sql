/*
# Add POS PIN column and update theme constraints

## Purpose
1. Adds a `pos_pin_hash` column to `branches` so each branch can have a PIN-protected POS terminal.
2. Updates the `profiles.theme_preference` CHECK constraint to include 'ocean' and 'slate' (new themes) and remove obsolete 'gold' and 'terracotta'.
3. Creates a `menu-images` storage bucket for uploading menu item photos.

## Changes
- `branches`: new column `pos_pin_hash` (text, nullable) — stores a hashed PIN for POS access.
- `profiles`: theme_preference constraint updated to allow 'ocean', 'emerald', 'slate', 'custom'.
- Storage: new public bucket `menu-images` for restaurant menu item photos.
- Storage: new public bucket `restaurant-assets` for logos, stamps, and other branding files.

## Security
- `pos_pin_hash` is write-protected: only org members can update it (via RLS already on branches).
- Storage buckets are public-read (so tablets can display images) but only authenticated users can upload.
*/

-- Add pos_pin_hash column to branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS pos_pin_hash text;

-- Update theme_preference constraint on profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_theme_preference_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_theme_preference_check
  CHECK (theme_preference = ANY (ARRAY['ocean'::text, 'emerald'::text, 'slate'::text, 'custom'::text]));

-- Insert storage buckets (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-assets', 'restaurant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for menu-images bucket
DROP POLICY IF EXISTS "Authenticated can upload menu images" ON storage.objects;
CREATE POLICY "Authenticated can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Public can read menu images" ON storage.objects;
CREATE POLICY "Public can read menu images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Authenticated can update menu images" ON storage.objects;
CREATE POLICY "Authenticated can update menu images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Authenticated can delete menu images" ON storage.objects;
CREATE POLICY "Authenticated can delete menu images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'menu-images');

-- Storage policies for restaurant-assets bucket
DROP POLICY IF EXISTS "Authenticated can upload restaurant assets" ON storage.objects;
CREATE POLICY "Authenticated can upload restaurant assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'restaurant-assets');

DROP POLICY IF EXISTS "Public can read restaurant assets" ON storage.objects;
CREATE POLICY "Public can read restaurant assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'restaurant-assets');

DROP POLICY IF EXISTS "Authenticated can update restaurant assets" ON storage.objects;
CREATE POLICY "Authenticated can update restaurant assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'restaurant-assets');

DROP POLICY IF EXISTS "Authenticated can delete restaurant assets" ON storage.objects;
CREATE POLICY "Authenticated can delete restaurant assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'restaurant-assets');

-- Function to hash and set POS PIN for a branch (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.set_branch_pos_pin(
  p_branch_id uuid,
  p_pin text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
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

  -- Simple hash: use crypt with pgcrypto if available, otherwise use md5 as fallback
  -- We use a simple hash approach since pgcrypto may not be enabled
  UPDATE branches
  SET pos_pin_hash = md5(p_pin || 'nutro_salt_2024')
  WHERE id = p_branch_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_branch_pos_pin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_branch_pos_pin(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_branch_pos_pin(uuid, text) TO authenticated;

-- Function to verify POS PIN
CREATE OR REPLACE FUNCTION public.verify_branch_pos_pin(
  p_branch_id uuid,
  p_pin text
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM branches
    WHERE id = p_branch_id
    AND pos_pin_hash = md5(p_pin || 'nutro_salt_2024')
  );
$$;

REVOKE ALL ON FUNCTION public.verify_branch_pos_pin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_branch_pos_pin(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_branch_pos_pin(uuid, text) TO authenticated;
