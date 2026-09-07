/*
# Two issues found via Supabase's own security/performance advisor

## 1. get_next_order_number had zero validation
Callable by `anon` (required — tablet self-order guests use a token-based
flow, not a Supabase Auth login, so this can't require `authenticated`) but
accepted ANY p_branch_id with no check it even exists, and unconditionally
inserted/incremented a counter row for it. Anyone on the internet could call
this RPC directly with an arbitrary UUID and either spam-increment a real
branch's order counter (skipping order numbers, a real operational nuisance
for whoever's reconciling receipts) or create counter rows for nonexistent
branches. It never exposed data (it only returns a formatted order number),
so this was never a data-breach risk -- but it's a real integrity/abuse gap,
tightened here with the minimal fix that doesn't break the legitimate
anonymous tablet flow: the branch must actually exist and be active.

## 2. adjust_menu_item_stock (added earlier today) had a mutable search_path
Flagged by the advisor. SECURITY INVOKER already limits its blast radius (it
runs with the caller's own RLS, not elevated), but an unset search_path is
still worth closing explicitly rather than relying on that alone.
*/

CREATE OR REPLACE FUNCTION public.get_next_order_number(p_branch_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_number integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.branches WHERE id = p_branch_id AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid branch';
  END IF;

  INSERT INTO branch_order_counters (branch_id, next_number)
  VALUES (p_branch_id, 1001)
  ON CONFLICT (branch_id) DO UPDATE
    SET next_number = branch_order_counters.next_number + 1
  RETURNING next_number INTO v_number;

  RETURN '#' || v_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_menu_item_stock(
  p_item_id uuid,
  p_delta integer
) RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new_stock integer;
BEGIN
  UPDATE public.menu_items
  SET stock = GREATEST(0, stock + p_delta)
  WHERE id = p_item_id
  RETURNING stock INTO v_new_stock;

  RETURN v_new_stock;
END;
$$;
