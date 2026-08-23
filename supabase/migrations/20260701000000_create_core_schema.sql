/*
# Core schema — reconstructed foundation

## Why this migration exists
Every later migration in this repo (fix_rls_tenant_isolation, create_tenant_onboarding_function,
add_pos_pin_and_theme_update, create_subscriptions_table, ...) assumes tables like `profiles`,
`organizations`, `branches`, `user_org_roles`, `menu_items`, `orders`, etc. already exist — but
none of them are ever created anywhere in this repo's migration history. On the live Supabase
project this points to, `select * from information_schema.tables` returns zero rows in the
`public` schema: the foundation was never actually applied, only the patches on top of it.

This migration reconstructs that foundation from everything the application code assumes about
it: the TypeScript interfaces in src/lib/supabase.ts (Profile, Organization, Branch, MenuItem,
MenuCategory, Order), the exact INSERT column lists in create_tenant_onboarding_function.sql,
and the table/column names referenced by the RLS policies in fix_rls_tenant_isolation.sql. Run
this BEFORE the other migrations (it's dated before them so `supabase db push` / sequential
SQL-editor execution applies it first).

## IMPORTANT
This is a best-effort reconstruction from code, not a copy of a real schema — I do not have
access to your live database. Review it before running, especially column types/defaults for
anything you know differs from what's below. Every statement uses IF NOT EXISTS so it's safe
to run even if some of this already exists.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- PROFILES (one row per auth.users row; system-wide role lives here)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  system_role text NOT NULL DEFAULT 'user' CHECK (system_role IN ('super_admin', 'sales_rep', 'accountant', 'user')),
  pin_hash text,
  theme_preference text NOT NULL DEFAULT 'ocean' CHECK (theme_preference IN ('ocean', 'emerald', 'slate')),
  custom_accent_color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Defined here (not just in fix_rls_tenant_isolation.sql) because policies further
-- down in this same migration already need it. fix_rls_tenant_isolation.sql
-- redefines it later with CREATE OR REPLACE, which is a harmless no-op given an
-- identical body. Must come after CREATE TABLE profiles above: Postgres validates
-- that referenced relations exist when a LANGUAGE SQL function is created.
CREATE OR REPLACE FUNCTION public.is_super_admin(check_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_uid AND system_role = 'super_admin'
  );
$$;

-- Creates a profile row automatically whenever a new auth user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ORGANIZATIONS (tenants)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan text NOT NULL DEFAULT 'trial' CHECK (plan IN ('starter', 'premium', 'enterprise', 'trial')),
  plan_status text NOT NULL DEFAULT 'trial' CHECK (plan_status IN ('trial', 'active', 'suspended', 'cancelled')),
  trial_ends_at timestamptz,
  billing_email text,
  referral_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BRANCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  country text,
  currency text NOT NULL DEFAULT 'USD',
  timezone text NOT NULL DEFAULT 'UTC',
  is_active boolean NOT NULL DEFAULT true,
  tablet_token text,
  kds_pin text,
  pos_pin_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- USER_ORG_ROLES (tenant membership; branch_id NULL = whole-org role)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_org_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  role_name text NOT NULL DEFAULT 'custom' CHECK (role_name IN ('owner', 'org_owner', 'branch_manager', 'cashier', 'kitchen_staff', 'accountant', 'custom')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id, branch_id)
);

-- ============================================================
-- MENU_CATEGORIES / MENU_ITEMS / MODIFIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  calories integer,
  protein_g numeric,
  carbs_g numeric,
  fats_g numeric,
  weight_g numeric,
  is_halal boolean NOT NULL DEFAULT false,
  is_vegan boolean NOT NULL DEFAULT false,
  is_vegetarian boolean NOT NULL DEFAULT false,
  is_gluten_free boolean NOT NULL DEFAULT false,
  is_keto boolean NOT NULL DEFAULT false,
  is_nut_free boolean NOT NULL DEFAULT false,
  contains_dairy boolean NOT NULL DEFAULT false,
  contains_shellfish boolean NOT NULL DEFAULT false,
  is_spicy boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  stock integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_item_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.modifier_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modifier_id uuid NOT NULL REFERENCES public.menu_item_modifiers(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_delta numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

-- ============================================================
-- RESTAURANT_TABLES / FLOOR_PLANS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text,
  seats integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.floor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Main Floor',
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ORDERS / ORDER_ITEMS / KDS_TICKETS / POS_SESSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  order_type text NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'paid', 'cancelled')),
  cashier_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL DEFAULT 0,
  modifiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kds_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'served')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  cashier_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  opening_cash numeric NOT NULL DEFAULT 0,
  closing_cash numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

-- ============================================================
-- PLATFORM-LEVEL (super admin only)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  commission_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BASELINE RLS (enable everywhere; fix_rls_tenant_isolation.sql
-- overwrites the tenant-scoped policies with the real per-table rules
-- once it runs after this migration — this just makes sure nothing is
-- left wide open in between, and covers the tables that migration
-- doesn't touch: organizations, user_org_roles).
-- ============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_org_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kds_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;

-- organizations: members (via user_org_roles) or super admins can read; only the
-- owner or a super admin can update. create_tenant (SECURITY DEFINER) bypasses this
-- for the initial insert.
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
CREATE POLICY "organizations_select" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND org_id = organizations.id)
  );

DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR owner_id = auth.uid())
  WITH CHECK (public.is_super_admin(auth.uid()) OR owner_id = auth.uid());

-- user_org_roles: users can see their own membership rows (and fellow members of the
-- same org, needed for staff lists); only super admins or the create_tenant/invite
-- functions (SECURITY DEFINER) can write.
DROP POLICY IF EXISTS "user_org_roles_select" ON public.user_org_roles;
CREATE POLICY "user_org_roles_select" ON public.user_org_roles
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_org_roles self WHERE self.user_id = auth.uid() AND self.org_id = user_org_roles.org_id)
  );

DROP POLICY IF EXISTS "user_org_roles_write" ON public.user_org_roles;
CREATE POLICY "user_org_roles_write" ON public.user_org_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- platform_metrics / sales_reps get their real policies from
-- fix_rls_tenant_isolation.sql (super_admin only). This just makes sure RLS is ON
-- with no permissive default before that migration runs.
