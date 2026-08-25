/*
# Cancelling an order never restored its stock

## The bug
20260825030000_decrement_stock_on_order.sql made placing an order actually
decrement menu_items.stock (previously nothing did). But PosTerminal.tsx has
a real "reject/cancel" action (updateOrder(id, o => ({ ...o, status:
'cancelled' }))) with no counterpart that gives the stock back. As soon as
the decrement trigger shipped, every cancelled order became a permanent
stock leak — reject a 3x order of something with 5 left, and it's stuck
reporting 2 in stock forever even though none of those 3 were ever actually
served.

## The fix
An AFTER UPDATE trigger on orders that fires only on the transition INTO
'cancelled' from some other status (not on every update, and not if an
order is already cancelled and gets touched again), and adds each of that
order's order_items quantities back to the linked menu item's stock — the
exact inverse of decrement_menu_item_stock.
*/

CREATE OR REPLACE FUNCTION public.restore_stock_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.menu_items m
    SET stock = m.stock + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.menu_item_id = m.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock_on_order_cancel ON public.orders;
CREATE TRIGGER trg_restore_stock_on_order_cancel
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_order_cancel();
