-- adjustStock() in menuStore.ts read `stock` from client-side React state, added
-- the delta, and wrote the result back as an absolute value. Two POS terminals
-- (or a POS and a tablet) decrementing the same item's stock within the same
-- render window both read the same starting number and each write their own
-- "current - 1", so one of the two decrements is silently lost — inventory
-- drifts out of sync with what was actually sold, worse the busier the
-- restaurant is (exactly when it matters most).
--
-- adjust_menu_item_stock() does the read-modify-write atomically inside a
-- single UPDATE statement in the database instead of in JS, so concurrent
-- calls can never observe each other's stale value. SECURITY INVOKER (the
-- default — not SECURITY DEFINER) is deliberate: it runs with the calling
-- user's own privileges, so the existing menu_items RLS policy (branch
-- membership) still applies exactly as it does to a normal UPDATE.
CREATE OR REPLACE FUNCTION public.adjust_menu_item_stock(
  p_item_id uuid,
  p_delta integer
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock integer;
BEGIN
  UPDATE public.menu_items
  SET stock = GREATEST(0, stock + p_delta)
  WHERE id = p_item_id
  RETURNING stock INTO v_new_stock;

  RETURN v_new_stock; -- NULL if no row matched (not found, or RLS denied it)
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_menu_item_stock(uuid, integer) TO authenticated;
