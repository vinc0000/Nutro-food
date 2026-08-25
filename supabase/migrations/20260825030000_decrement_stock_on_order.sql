/*
# Stock was never actually decremented by real orders

## The bug
menu_items.stock exists, is edited manually in the admin Menu page (+/- buttons,
adjustStock in menuStore.ts), and is already used client-side to gate ordering
(PosTerminal's posMenu marks an item unavailable once stock <= 0; TabletMenu's
addToCart refuses to add an item once stock <= 0). But nothing anywhere ever
decreased stock when an order was actually placed — from the POS or the tablet.
In other words: stock only ever goes down if a staff member remembers to click
the minus button by hand, no matter how many of that item actually sell. A busy
service would silently keep selling an item that's actually out.

## The fix
An AFTER INSERT trigger on order_items that atomically decrements the linked
menu item's stock by the ordered quantity, floored at 0. This runs as part of
the same insert (POS and tablet both go through order_items regardless of
which client placed the order — see ordersStore.ts addOrder), and the UPDATE
itself is atomic, so it's race-safe under concurrent orders for the same item
the same way the order-number counter is.

menu_item_id is nullable on order_items (a line item can exist without a
catalog reference), so the trigger is a no-op in that case rather than an
error.
*/

CREATE OR REPLACE FUNCTION public.decrement_menu_item_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.menu_item_id IS NOT NULL THEN
    UPDATE public.menu_items
    SET stock = GREATEST(0, stock - NEW.quantity)
    WHERE id = NEW.menu_item_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_menu_item_stock ON public.order_items;
CREATE TRIGGER trg_decrement_menu_item_stock
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_menu_item_stock();
