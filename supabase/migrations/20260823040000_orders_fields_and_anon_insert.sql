/*
# Orders: extra columns + anonymous order placement

## Why
Wiring Orders.tsx/PosTerminal/KdsView/TabletMenu off localStorage and onto real
public.orders/order_items needs a few things the reconstructed schema didn't have:

1. `orders.table_label` — the app currently treats "table" as a free-text label typed
   at the POS/tablet (e.g. 'Table 4'), not a foreign key into restaurant_tables (there
   is no floor-plan management UI yet). Rather than force that larger feature to exist
   first, this stores the label directly; table_id stays available for later.
2. `orders.source` ('pos' | 'tablet') and `orders.updated_at` — used throughout the
   frontend's SharedOrder type but missing from the original schema.
3. Anonymous INSERT policies on orders/order_items — the customer tablet has NO
   Supabase Auth session (see the anon menu read policies from the previous
   migration), so it needs its own narrow write permission to place an order. It does
   NOT get SELECT: the client generates its own id/order_item ids (see ordersStore.ts)
   so it never needs to read a row back after inserting it.
*/

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_label text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'pos' CHECK (source IN ('pos', 'tablet'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Anonymous customers can only ever INSERT a 'tablet'-sourced order on an active
-- branch — never read, update, or delete any order (their own or anyone else's).
DROP POLICY IF EXISTS "orders_anon_insert" ON public.orders;
CREATE POLICY "orders_anon_insert" ON public.orders
  FOR INSERT TO anon
  WITH CHECK (
    source = 'tablet'
    AND EXISTS (SELECT 1 FROM public.branches b WHERE b.id = orders.branch_id AND b.is_active = true)
  );

DROP POLICY IF EXISTS "order_items_anon_insert" ON public.order_items;
CREATE POLICY "order_items_anon_insert" ON public.order_items
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.source = 'tablet')
  );
