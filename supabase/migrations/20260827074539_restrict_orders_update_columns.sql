-- orders_update's RLS check only verifies branch membership, not which columns are
-- being touched — meaning any branch staff member (cashier, kitchen staff, waiter,
-- not just owner/manager) could directly UPDATE financial columns like
-- refund_amount, payment_status, or total_amount, completely bypassing
-- refund_order()'s careful role/amount checks. The app itself only ever updates
-- {status, payment_status, payment_method, notes, updated_at} via this path
-- (verified against every ordersStore.ts / PosTerminal.tsx / KDS call site) —
-- refunds go through refund_order() (SECURITY DEFINER), never a raw update.
--
-- Column-level GRANTs are enforced alongside RLS (both must pass), so this closes
-- the gap without touching the RLS policy itself: financial/audit columns can now
-- only ever be changed by SECURITY DEFINER functions (which run as their owner,
-- not the authenticated role), never by a direct client update no matter what role
-- a staff member holds.
REVOKE UPDATE ON public.orders FROM authenticated;
GRANT UPDATE (status, payment_status, payment_method, notes, updated_at) ON public.orders TO authenticated;
