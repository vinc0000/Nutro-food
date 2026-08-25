/*
# Atomic, collision-safe order numbers

## Problem
Order numbers were generated client-side, and inconsistently between the two
places that create orders:
- POS (PosTerminal.tsx): '#' + (1042 + orderCount + 1) — 1042 is a leftover from
  the KDS demo seed data, and orderCount is just how many orders happen to be
  loaded in that browser tab right now. Two cashiers, or the same cashier after
  a page reload or with a filtered view, will regularly compute the same number.
- Tablet (TabletMenu.tsx): '#' + a random 4-digit number — no uniqueness
  guarantee at all; two tables ordering around the same time can collide.

Either way, the kitchen can end up with two different orders showing the same
ticket number, which is exactly the kind of thing a KDS exists to prevent.

## Fix
A `branch_order_counters` table (one row per branch, atomically incremented)
plus a SECURITY DEFINER function that hands out the next number. Using
UPDATE ... RETURNING makes the increment atomic even under concurrent callers,
which a client-side "read count then add one" can never be.

Granted to anon as well as authenticated: the customer tablet has no auth
session (same reasoning as the write-only orders/order_items policies from
migration 20260823040000), and an order-number counter carries no sensitive
data, so there is no RLS concern in exposing it.
*/

CREATE TABLE IF NOT EXISTS branch_order_counters (
  branch_id uuid PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
  next_number integer NOT NULL DEFAULT 1000
);

ALTER TABLE branch_order_counters ENABLE ROW LEVEL SECURITY;

-- No direct table access for anyone — this table is only ever touched through
-- the SECURITY DEFINER function below, same pattern as refund_order.
CREATE POLICY "no_direct_access" ON branch_order_counters
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.get_next_order_number(p_branch_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number integer;
BEGIN
  INSERT INTO branch_order_counters (branch_id, next_number)
  VALUES (p_branch_id, 1001)
  ON CONFLICT (branch_id) DO UPDATE
    SET next_number = branch_order_counters.next_number + 1
  RETURNING next_number INTO v_number;

  RETURN '#' || v_number;
END;
$$;

REVOKE ALL ON FUNCTION public.get_next_order_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_order_number(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_next_order_number(uuid) TO authenticated;
