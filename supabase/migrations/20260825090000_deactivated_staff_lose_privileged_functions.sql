/*
# Same is_active gap in the remaining membership-role-checking functions

20260825080000 fixed the two foundational helpers (user_org_member,
user_branch_member) plus the integrations policies. These three functions run
their own independent EXISTS(...) checks against user_org_roles rather than
going through those helpers, so they needed the same fix separately:

- set_branch_pos_pin: any org member — active or not — could change the branch's
  POS PIN.
- set_staff_pin: any owner/org_owner/branch_manager — active or not — could reset
  another staff member's PIN.
- refund_order: any owner/org_owner/branch_manager — active or not — could refund
  a paid order.

Also brings subscriptions' SELECT/INSERT policies in line for consistency (lower
severity — billing history visibility, not a write path to money movement — but
the same gap).
*/

CREATE OR REPLACE FUNCTION public.set_branch_pos_pin(
  p_branch_id uuid,
  p_pin text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF p_pin IS NULL OR length(p_pin) < 4 THEN
    RETURN false;
  END IF;

  SELECT b.org_id INTO v_org_id FROM branches b WHERE b.id = p_branch_id;
  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_org_roles
    WHERE user_id = auth.uid() AND org_id = v_org_id AND is_active = true
  ) THEN
    RETURN false;
  END IF;

  UPDATE branches
  SET pos_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  WHERE id = p_branch_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_staff_pin(
  p_target_user_id uuid,
  p_pin text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_pin IS NULL OR length(p_pin) < 4 OR length(p_pin) > 8 THEN
    RETURN false;
  END IF;

  IF p_target_user_id != auth.uid()
     AND NOT public.is_super_admin(auth.uid())
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_org_roles caller
       JOIN public.user_org_roles target ON target.org_id = caller.org_id
       WHERE caller.user_id = auth.uid()
         AND caller.is_active = true
         AND target.user_id = p_target_user_id
         AND caller.role_name IN ('owner', 'org_owner', 'branch_manager')
     )
  THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  WHERE id = p_target_user_id;

  RETURN true;
END;
$$;

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
    WHERE user_id = auth.uid() AND org_id = v_org_id AND is_active = true
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

DROP POLICY IF EXISTS "select_own_subscriptions" ON public.subscriptions;
CREATE POLICY "select_own_subscriptions" ON public.subscriptions FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND org_id = subscriptions.org_id AND is_active = true)
  );

DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = auth.uid() AND org_id = subscriptions.org_id AND is_active = true)
  );
