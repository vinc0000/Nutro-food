/*
# Extend menu_items with fields the Menu editor actually uses

The reconstructed core schema (20260701000000) covered every menu_items field visible
in the Menu TypeScript interface at the time, but not the ones only used inside
src/pages/admin/Menu.tsx's local form state: fiber, allergens, ingredients, tax rate,
and portion size. Wiring the Menu page to real data needs these to exist.
*/

ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS fiber_g numeric;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS allergens jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS ingredients jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS portion_size text NOT NULL DEFAULT 'Regular';

-- Menu items and categories must be readable WITHOUT login for the customer-facing
-- tablet ordering screen (public.tablet_token identifies the branch; there is no
-- Supabase Auth session on a self-service tablet). Scope the anonymous read strictly
-- to items that are actually available, on active branches — no other columns or
-- tables are exposed to anon.
DROP POLICY IF EXISTS "menu_items_anon_select" ON public.menu_items;
CREATE POLICY "menu_items_anon_select" ON public.menu_items
  FOR SELECT TO anon
  USING (
    is_available = true
    AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = menu_items.branch_id AND b.is_active = true)
  );

DROP POLICY IF EXISTS "menu_categories_anon_select" ON public.menu_categories;
CREATE POLICY "menu_categories_anon_select" ON public.menu_categories
  FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = menu_categories.branch_id AND b.is_active = true)
  );

-- The tablet also needs to resolve which branch a table/tablet belongs to without
-- auth. Only expose the minimal identifying fields a customer's tablet needs — never
-- pos_pin_hash/kds_pin. (Column-level security via a view, since PostgREST RLS is
-- row-level: this view is what the tablet queries instead of the branches table
-- directly.)
-- Includes tablet_token so the client can filter `.eq('tablet_token', token)` to
-- resolve which branch a tablet belongs to — the frontend must explicitly select only
-- ('id,name,currency,country,city') and never request tablet_token back, or anyone
-- could enumerate valid tokens for every branch by scanning this view unfiltered.
CREATE OR REPLACE VIEW public.branch_public_info AS
SELECT id, name, currency, country, city, tablet_token
FROM public.branches
WHERE is_active = true;

GRANT SELECT ON public.branch_public_info TO anon;
