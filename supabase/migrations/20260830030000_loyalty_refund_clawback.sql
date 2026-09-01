/*
# Claw back loyalty points on refund

## The gap
award_loyalty_points() only fired on the payment_status transition into 'paid'
— a refund issued afterwards (which changes refund_amount, not payment_status,
on an order that's been 'paid' the whole time) never adjusted the points
already awarded. A customer refunded in full would keep every point earned on
money they got back.

## The fix
Extends award_loyalty_points() with an independent clawback branch: whenever
refund_amount increases on an already-paid order with a loyalty-enabled org
and a customer_phone, deduct points proportional to the refunded amount
(same points_per_currency_unit rate used to award them), floored at zero so a
balance already spent on a redeemed reward never goes negative. This runs
before the existing award-on-transition logic and is independent of it — a
partial refund on an order still being adjusted otherwise doesn't interact
with the award path at all.
*/

CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_settings record;
  v_net_amount numeric;
  v_points_to_award integer;
  v_refund_delta numeric;
  v_points_to_claw_back integer;
BEGIN
  IF NEW.payment_status = 'paid' AND COALESCE(NEW.refund_amount, 0) > COALESCE(OLD.refund_amount, 0) AND NEW.customer_phone IS NOT NULL AND NEW.customer_phone <> '' THEN
    SELECT b.org_id INTO v_org_id FROM public.branches b WHERE b.id = NEW.branch_id;
    IF v_org_id IS NOT NULL THEN
      SELECT * INTO v_settings FROM public.loyalty_settings WHERE org_id = v_org_id;
      IF FOUND AND v_settings.enabled THEN
        v_refund_delta := NEW.refund_amount - COALESCE(OLD.refund_amount, 0);
        v_points_to_claw_back := floor(v_refund_delta * v_settings.points_per_currency_unit);
        IF v_points_to_claw_back > 0 THEN
          UPDATE public.loyalty_accounts
          SET points_balance = GREATEST(points_balance - v_points_to_claw_back, 0)
          WHERE org_id = v_org_id AND customer_phone = NEW.customer_phone;
        END IF;
      END IF;
    END IF;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM 'paid' OR OLD.payment_status = 'paid' THEN
    RETURN NEW;
  END IF;
  IF NEW.customer_phone IS NULL OR NEW.customer_phone = '' THEN
    RETURN NEW;
  END IF;

  SELECT b.org_id INTO v_org_id FROM public.branches b WHERE b.id = NEW.branch_id;
  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_settings FROM public.loyalty_settings WHERE org_id = v_org_id;
  IF NOT FOUND OR NOT v_settings.enabled THEN
    RETURN NEW;
  END IF;

  v_net_amount := GREATEST(NEW.total_amount - COALESCE(NEW.refund_amount, 0), 0);
  v_points_to_award := floor(v_net_amount * v_settings.points_per_currency_unit);
  IF v_points_to_award <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.loyalty_accounts (org_id, customer_phone, points_balance, lifetime_points, last_order_at)
  VALUES (v_org_id, NEW.customer_phone, v_points_to_award, v_points_to_award, now())
  ON CONFLICT (org_id, customer_phone) DO UPDATE
  SET points_balance = public.loyalty_accounts.points_balance + v_points_to_award,
      lifetime_points = public.loyalty_accounts.lifetime_points + v_points_to_award,
      last_order_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
