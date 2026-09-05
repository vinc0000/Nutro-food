-- The menu-images and restaurant-assets buckets (created in
-- 20260804091319_add_pos_pin_and_theme_update.sql) were public with NO
-- allowed_mime_types or file_size_limit set at the bucket level -- only the
-- frontend (Menu.tsx / Settings.tsx) checked file type and size before
-- uploading. That check is trivial to bypass: anyone with a valid session
-- token can call the Storage API directly (curl, Postman, a modified
-- frontend) and upload anything -- including an SVG carrying a <script>,
-- served back from a PUBLIC url anyone can open directly (stored XSS), or
-- an oversized file with no real cap.
--
-- This sets the same allow-list at the bucket level, which Supabase Storage
-- enforces on every upload regardless of client, closing that gap for real.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    file_size_limit = 2097152 -- 2 MB, matches the frontend's own limit
WHERE id IN ('menu-images', 'restaurant-assets');
