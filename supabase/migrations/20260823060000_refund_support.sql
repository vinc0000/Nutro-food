/*
# Real refund tracking

## Why
Reports.tsx previously showed a hardcoded $0 "Refunds" figure with a note explaining
there was no real refund flow anywhere in the app. This adds one.

## Design
- orders gets refund_amount/refunded_at/refund_reason/refunded_by. Partial refunds are
  supported: payment_status only flips to 'refunded' once refund_amount reaches the
  order total; a partial refund keeps payment_status = 'paid' with refund_amount > 0
  tracked alongside it, so "how much did we actually keep" is always derivable.
- refund_order() is a SECURITY DEFINER RPC, not a plain client-side UPDATE, so the
  authorization and "can't refund more than was paid" checks are enforced in the
  database regardless of what the client sends: only a branch_manager/owner/org_owner
  of that order's org, or a platform super admin, may call it, and it caps the amount
  server-side.
*/

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.refund_order(
  p_order_id uuid,
  p_amount numeric,
  p_reason text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_org_id uuid;
  v_new_refund_amount numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN false;
  END IF;

  SELECT o.*, b.org_id INTO v_order
  FROM public.orders o
  JOIN public.branches b ON b.id = o.branch_id
  WHERE o.id = p_order_id;

  IF v_order IS NULL THEN
    RETURN false;
  END IF;
  v_org_id := v_order.org_id;

  IF NOT public.is_super_admin(auth.uid()) AND NOT EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = auth.uid() AND org_id = v_org_id
      AND role_name IN ('owner', 'org_owner', 'branch_manager')
  ) THEN
    RETURN false;
  END IF;

  IF v_order.payment_status NOT IN ('paid', 'refunded') THEN
    RETURN false; -- can't refund an order that was never actually paid
  END IF;

  v_new_refund_amount := v_order.refund_amount + p_amount;
  IF v_new_refund_amount > v_order.total_amount THEN
    RETURN false; -- never allow refunding more than was actually charged
  END IF;

  UPDATE public.orders
  SET refund_amount = v_new_refund_amount,
      refunded_at = now(),
      refund_reason = p_reason,
      refunded_by = auth.uid(),
      payment_status = CASE WHEN v_new_refund_amount >= v_order.total_amount THEN 'refunded' ELSE payment_status END,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_order(uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_order(uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.refund_order(uuid, numeric, text) TO authenticated;
