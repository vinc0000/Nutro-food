-- Foreign key columns have no index by default in Postgres. Every one of these
-- is used as a JOIN or WHERE filter (tenant scoping by org_id/branch_id, POS/KDS
-- lookups by order_id, audit/support lookups by actor/created_by, etc.), so an
-- unindexed FK here means a sequential scan on every such query. Identified by
-- querying pg_constraint/pg_index directly against the live database (not
-- guessed from migration file text, which is unreliable for this).
--
-- CREATE INDEX IF NOT EXISTS is idempotent and safe to run more than once.
-- Not using CONCURRENTLY: these are early-stage/trial tenant tables, small
-- enough that a brief write-lock during index build is not a concern. If any
-- of these tables grow large before this runs, build the index manually with
-- CREATE INDEX CONCURRENTLY outside a transaction instead.

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

CREATE INDEX IF NOT EXISTS idx_branches_org_id ON public.branches(org_id);

CREATE INDEX IF NOT EXISTS idx_menu_categories_branch_id ON public.menu_categories(branch_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_branch_id ON public.menu_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_modifiers_menu_item_id ON public.menu_item_modifiers(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_modifier_options_modifier_id ON public.modifier_options(modifier_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_branch_id ON public.restaurant_tables(branch_id);

CREATE INDEX IF NOT EXISTS idx_floor_plans_branch_id ON public.floor_plans(branch_id);

CREATE INDEX IF NOT EXISTS idx_orders_refunded_by ON public.orders(refunded_by);
CREATE INDEX IF NOT EXISTS idx_orders_cashier_id ON public.orders(cashier_id);

CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_kds_tickets_order_id ON public.kds_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_kds_tickets_branch_id ON public.kds_tickets(branch_id);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_branch_id ON public.pos_sessions(branch_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_cashier_id ON public.pos_sessions(cashier_id);

CREATE INDEX IF NOT EXISTS idx_sales_reps_user_id ON public.sales_reps(user_id);

CREATE INDEX IF NOT EXISTS idx_integrations_connected_by ON public.integrations(connected_by);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log(actor_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON public.api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON public.api_keys(created_by);

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_org_id ON public.support_tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets(created_by);

CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_by ON public.platform_settings(updated_by);
