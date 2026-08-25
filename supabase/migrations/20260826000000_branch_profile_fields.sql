/*
# Branch profile fields: fix multi-device inconsistency

Settings.tsx's General/Localization/Social tabs saved everything to localStorage
(nutro:settings:*) — per browser, not per branch. An owner setting their address or
Instagram link from one computer would never see it reflected on another device, and
the customer-facing tablet / POS (which read the same localStorage keys) would show
stale or default placeholder info on any device other than wherever it was last saved.

Adds the missing columns to `branches` — the natural per-branch home for this data,
consistent with currency/country/city/address already living there — so this becomes
real, shared, database-backed profile data instead of a per-browser cache.
*/

ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS state_region text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS sector text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS landmark text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS tiktok_url text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS google_reviews_url text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS stamp_url text;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS logo_url text;

-- The customer tablet reads branch name/logo/socials without a Supabase Auth
-- session, same reasoning as the existing anon menu-read policies.
DROP VIEW IF EXISTS public.branch_public_info;
CREATE VIEW public.branch_public_info AS
SELECT id, name, currency, country, city, address, contact_phone, whatsapp_number,
       instagram_url, tiktok_url, facebook_url, google_reviews_url, logo_url
FROM public.branches
WHERE is_active = true;

GRANT SELECT ON public.branch_public_info TO anon;
