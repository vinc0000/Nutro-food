/*
# Fix RLS Tenant Isolation

## Problem
All tenant-scoped tables (branches, menu_items, orders, kds_tickets, etc.) used
`FOR ALL` with `USING (true)` and `WITH CHECK (true)` — meaning any authenticated
user could read/modify ANY tenant's data. This is a critical multi-tenant isolation
violation.

## Changes
1. Create two SECURITY DEFINER helper functions:
   - `is_super_admin(uid)` — checks if user has system_role = 'super_admin' in profiles
   - `user_org_member(uid, org_id)` — checks if user has a role in user_org_roles for the org
   - `user_branch_member(uid, branch_id)` — checks if user has a role linked to the branch's org
2. Replace all permissive `FOR ALL` policies with 4 separate CRUD policies per table:
   - SELECT, INSERT, UPDATE, DELETE
   - Each scoped to super_admin OR org/branch membership
3. platform_metrics: super_admin only
4. sales_reps: super_admin only
5. Fix `handle_new_user` function search_path

## Tables affected
- branches (org-scoped)
- floor_plans (branch-scoped via branches)
- kds_tickets (branch-scoped)
- menu_categories (branch-scoped)
- menu_item_modifiers (branch-scoped via menu_items)
- menu_items (branch-scoped)
- modifier_options (branch-scoped via menu_item_modifiers)
- order_items (branch-scoped via orders)
- orders (branch-scoped)
- platform_metrics (super_admin only)
- pos_sessions (branch-scoped)
- restaurant_tables (branch-scoped)
- sales_reps (super_admin only)

## Security
- All policies now enforce tenant isolation
- Super admins retain platform-wide access
- Org members can only access their own org's data
- Branch members can only access their own branch's data
*/

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER for cross-table checks)
-- ============================================================

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

CREATE OR REPLACE FUNCTION public.user_org_member(check_uid uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = check_uid AND org_id = check_org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_branch_member(check_uid uuid, check_branch_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_org_roles uor
    JOIN public.branches b ON b.org_id = uor.org_id
    WHERE uor.user_id = check_uid
      AND (uor.branch_id = check_branch_id OR uor.branch_id IS NULL)
      AND b.id = check_branch_id
  );
$$;

-- Fix handle_new_user search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

-- ============================================================
-- BRANCHES (org-scoped: user must be super_admin or org member)
-- ============================================================

DROP POLICY IF EXISTS "branches_auth" ON public.branches;

CREATE POLICY "branches_select" ON public.branches
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_org_member(auth.uid(), org_id));

CREATE POLICY "branches_insert" ON public.branches
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_org_member(auth.uid(), org_id));

CREATE POLICY "branches_update" ON public.branches
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_org_member(auth.uid(), org_id));

CREATE POLICY "branches_delete" ON public.branches
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_org_member(auth.uid(), org_id));

-- ============================================================
-- FLOOR_PLANS (branch-scoped)
-- ============================================================

DROP POLICY IF EXISTS "floor_plans_auth" ON public.floor_plans;

CREATE POLICY "floor_plans_select" ON public.floor_plans
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "floor_plans_insert" ON public.floor_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "floor_plans_update" ON public.floor_plans
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "floor_plans_delete" ON public.floor_plans
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

-- ============================================================
-- KDS_TICKETS (branch-scoped)
-- ============================================================

DROP POLICY IF EXISTS "kds_auth" ON public.kds_tickets;

CREATE POLICY "kds_select" ON public.kds_tickets
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "kds_insert" ON public.kds_tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "kds_update" ON public.kds_tickets
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "kds_delete" ON public.kds_tickets
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

-- ============================================================
-- MENU_CATEGORIES (branch-scoped)
-- ============================================================

DROP POLICY IF EXISTS "menu_cats_auth" ON public.menu_categories;

CREATE POLICY "menu_cats_select" ON public.menu_categories
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "menu_cats_insert" ON public.menu_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "menu_cats_update" ON public.menu_categories
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "menu_cats_delete" ON public.menu_categories
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

-- ============================================================
-- MENU_ITEMS (branch-scoped)
-- ============================================================

DROP POLICY IF EXISTS "menu_items_auth" ON public.menu_items;

CREATE POLICY "menu_items_select" ON public.menu_items
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "menu_items_insert" ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "menu_items_update" ON public.menu_items
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "menu_items_delete" ON public.menu_items
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

-- ============================================================
-- MENU_ITEM_MODIFIERS (branch-scoped via menu_items)
-- ============================================================

DROP POLICY IF EXISTS "modifiers_auth" ON public.menu_item_modifiers;

CREATE POLICY "modifiers_select" ON public.menu_item_modifiers
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_modifiers.menu_item_id
        AND public.user_branch_member(auth.uid(), mi.branch_id)
    )
  );

CREATE POLICY "modifiers_insert" ON public.menu_item_modifiers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_modifiers.menu_item_id
        AND public.user_branch_member(auth.uid(), mi.branch_id)
    )
  );

CREATE POLICY "modifiers_update" ON public.menu_item_modifiers
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_modifiers.menu_item_id
        AND public.user_branch_member(auth.uid(), mi.branch_id)
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_modifiers.menu_item_id
        AND public.user_branch_member(auth.uid(), mi.branch_id)
    )
  );

CREATE POLICY "modifiers_delete" ON public.menu_item_modifiers
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      WHERE mi.id = menu_item_modifiers.menu_item_id
        AND public.user_branch_member(auth.uid(), mi.branch_id)
    )
  );

-- ============================================================
-- MODIFIER_OPTIONS (branch-scoped via menu_item_modifiers -> menu_items)
-- ============================================================

DROP POLICY IF EXISTS "modifier_opts_auth" ON public.modifier_options;

CREATE POLICY "mod_opts_select" ON public.modifier_options
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.menu_item_modifiers mim
      JOIN public.menu_items mi ON mi.id = mim.menu_item_id
      WHERE mim.id = modifier_options.modifier_id
        AND public.user_branch_member(auth.uid(), mi.branch_id)
    )
  );

CREATE POLICY "mod_opts_insert" ON public.modifier_options
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.menu_item_modifiers mim
      JOIN public.menu_items mi ON mi.id = mim.menu_item_id
      WHERE mim.id = modifier_options.modifier_id
        AND public.user_branch_member(auth.uid(), mi.branch_id)
    )
  );

CREATE POLICY "mod_opts_update" ON public.modifier_options
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.menu_item_modifiers mim
      JOIN public.menu_items mi ON mi.id = mim.menu_item_id
      WHERE mim.id = modifier_options.modifier_id
        AND public.user_branch_member(auth.uid(), mi.branch_id)
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.menu_item_modifiers mim
      JOIN public.menu_items mi ON mi.id = mim.menu_item_id
      WHERE mim.id = modifier_options.modifier_id
        AND public.user_branch_member(auth.uid(), mi.branch_id)
    )
  );

CREATE POLICY "mod_opts_delete" ON public.modifier_options
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.menu_item_modifiers mim
      JOIN public.menu_items mi ON mi.id = mim.menu_item_id
      WHERE mim.id = modifier_options.modifier_id
        AND public.user_branch_member(auth.uid(), mi.branch_id)
    )
  );

-- ============================================================
-- ORDERS (branch-scoped)
-- ============================================================

DROP POLICY IF EXISTS "orders_auth" ON public.orders;

CREATE POLICY "orders_select" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "orders_delete" ON public.orders
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

-- ============================================================
-- ORDER_ITEMS (branch-scoped via orders)
-- ============================================================

DROP POLICY IF EXISTS "order_items_auth" ON public.order_items;

CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND public.user_branch_member(auth.uid(), o.branch_id)
    )
  );

CREATE POLICY "order_items_insert" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND public.user_branch_member(auth.uid(), o.branch_id)
    )
  );

CREATE POLICY "order_items_update" ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND public.user_branch_member(auth.uid(), o.branch_id)
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND public.user_branch_member(auth.uid(), o.branch_id)
    )
  );

CREATE POLICY "order_items_delete" ON public.order_items
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND public.user_branch_member(auth.uid(), o.branch_id)
    )
  );

-- ============================================================
-- PLATFORM_METRICS (super_admin only)
-- ============================================================

DROP POLICY IF EXISTS "platform_metrics_auth" ON public.platform_metrics;

CREATE POLICY "platform_metrics_select" ON public.platform_metrics
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "platform_metrics_insert" ON public.platform_metrics
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "platform_metrics_update" ON public.platform_metrics
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "platform_metrics_delete" ON public.platform_metrics
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ============================================================
-- POS_SESSIONS (branch-scoped)
-- ============================================================

DROP POLICY IF EXISTS "pos_sessions_auth" ON public.pos_sessions;

CREATE POLICY "pos_sessions_select" ON public.pos_sessions
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "pos_sessions_insert" ON public.pos_sessions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "pos_sessions_update" ON public.pos_sessions
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "pos_sessions_delete" ON public.pos_sessions
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

-- ============================================================
-- RESTAURANT_TABLES (branch-scoped)
-- ============================================================

DROP POLICY IF EXISTS "tables_auth" ON public.restaurant_tables;

CREATE POLICY "tables_select" ON public.restaurant_tables
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "tables_insert" ON public.restaurant_tables
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "tables_update" ON public.restaurant_tables
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

CREATE POLICY "tables_delete" ON public.restaurant_tables
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_branch_member(auth.uid(), branch_id));

-- ============================================================
-- SALES_REPS (super_admin only)
-- ============================================================

DROP POLICY IF EXISTS "sales_reps_auth" ON public.sales_reps;

CREATE POLICY "sales_reps_select" ON public.sales_reps
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "sales_reps_insert" ON public.sales_reps
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "sales_reps_update" ON public.sales_reps
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "sales_reps_delete" ON public.sales_reps
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
