/*
# Loyalty program (points earned per sale, admin-configurable reward)

## Design
Keyed by customer_phone (already collected at POS/tablet checkout) + org_id —
no separate customer signup required, matching how the rest of this app treats
customer contact info (optional, phone-only).

- loyalty_settings: one row per org. points_per_currency_unit (how many points
  per $1 spent, default 1), reward_threshold (points needed for the reward),
  reward_description (free text the admin sets, e.g. "Free coffee"), enabled.
- loyalty_accounts: one row per (org_id, customer_phone). points_balance is the
  current redeemable balance; lifetime_points never decreases (for reporting).
- Award trigger: AFTER UPDATE ON orders, when payment_status transitions to
  'paid' AND customer_phone is present AND the org has loyalty enabled, credits
  floor(net_amount * points_per_currency_unit) points. Net amount excludes any
  refund already applied at that moment, mirroring how the X/Z report computes
  net sales. Idempotent by design: only fires on the payment_status transition
  itself (OLD.payment_status IS DISTINCT FROM 'paid' AND NEW.payment_status =
  'paid'), so re-saving an already-paid order never double-credits.
- Redemption is handled entirely in the POS UI (deduct points_balance via a
  normal UPDATE through RLS, when a cashier applies a reward) — no separate
  redemption table needed for this scope; lifetime_points still reflects total
  ever earned regardless of redemptions.
*/

CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  points_per_currency_unit numeric NOT NULL DEFAULT 1 CHECK (points_per_currency_unit > 0),
  reward_threshold integer NOT NULL DEFAULT 100 CHECK (reward_threshold > 0),
  reward_description text NOT NULL DEFAULT 'Free item',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  points_balance integer NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points integer NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_org_phone ON public.loyalty_accounts(org_id, customer_phone);

ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;

-- Same org-membership pattern used everywhere else in this schema (user_org_roles
-- with is_active = true), not a new authorization model.
CREATE POLICY "loyalty_settings_select" ON public.loyalty_settings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND org_id = loyalty_settings.org_id AND is_active = true));

CREATE POLICY "loyalty_settings_write" ON public.loyalty_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND org_id = loyalty_settings.org_id AND is_active = true AND role_name IN ('owner', 'org_owner', 'branch_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND org_id = loyalty_settings.org_id AND is_active = true AND role_name IN ('owner', 'org_owner', 'branch_manager')));

CREATE POLICY "loyalty_accounts_select" ON public.loyalty_accounts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND org_id = loyalty_accounts.org_id AND is_active = true));

-- Redemption (points_balance decrease) happens from the POS by any active staff
-- member with org access, same as ringing up a sale — not restricted to managers.
CREATE POLICY "loyalty_accounts_update" ON public.loyalty_accounts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND org_id = loyalty_accounts.org_id AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND org_id = loyalty_accounts.org_id AND is_active = true));

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
BEGIN
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
  -- Never block an order update because of a loyalty bookkeeping issue.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_loyalty_points ON public.orders;
CREATE TRIGGER trg_award_loyalty_points
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_points();

-- Orders are also sometimes created already paid (POS cash sale, single insert,
-- no separate "mark as paid" update) — cover that path too.
CREATE OR REPLACE FUNCTION public.award_loyalty_points_on_insert()
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
BEGIN
  IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
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

DROP TRIGGER IF EXISTS trg_award_loyalty_points_on_insert ON public.orders;
CREATE TRIGGER trg_award_loyalty_points_on_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_points_on_insert();

-- Lets a cashier look up a customer's points balance by phone from the POS without
-- exposing every other org's loyalty data — same auth.uid()-based org check as the
-- table's own RLS, wrapped as an RPC so the POS can call it in one round trip
-- even for a phone number that has no account row yet (returns zero/null cleanly
-- instead of requiring the client to handle a missing-row case).
CREATE OR REPLACE FUNCTION public.get_loyalty_balance(p_customer_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_settings record;
  v_account record;
BEGIN
  SELECT org_id INTO v_org_id FROM public.user_org_roles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  SELECT * INTO v_settings FROM public.loyalty_settings WHERE org_id = v_org_id;
  IF NOT FOUND OR NOT v_settings.enabled THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  SELECT * INTO v_account FROM public.loyalty_accounts WHERE org_id = v_org_id AND customer_phone = p_customer_phone;

  RETURN jsonb_build_object(
    'enabled', true,
    'points_balance', COALESCE(v_account.points_balance, 0),
    'lifetime_points', COALESCE(v_account.lifetime_points, 0),
    'reward_threshold', v_settings.reward_threshold,
    'reward_description', v_settings.reward_description,
    'points_per_currency_unit', v_settings.points_per_currency_unit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_loyalty_balance(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_loyalty_balance(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_loyalty_balance(text) TO authenticated;

-- Redeems a reward: deducts reward_threshold points from the account if it has
-- enough. SECURITY DEFINER + its own auth.uid()-based org check, same reasoning
-- as get_loyalty_balance — a cashier redeeming a reward is a normal POS action,
-- not a manager-only one.
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(p_customer_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_settings record;
  v_account record;
BEGIN
  SELECT org_id INTO v_org_id FROM public.user_org_roles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No organization context');
  END IF;

  SELECT * INTO v_settings FROM public.loyalty_settings WHERE org_id = v_org_id;
  IF NOT FOUND OR NOT v_settings.enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'Loyalty program is not enabled');
  END IF;

  SELECT * INTO v_account FROM public.loyalty_accounts WHERE org_id = v_org_id AND customer_phone = p_customer_phone FOR UPDATE;
  IF NOT FOUND OR v_account.points_balance < v_settings.reward_threshold THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough points');
  END IF;

  UPDATE public.loyalty_accounts
  SET points_balance = points_balance - v_settings.reward_threshold
  WHERE id = v_account.id;

  RETURN jsonb_build_object('success', true, 'points_balance', v_account.points_balance - v_settings.reward_threshold);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_reward(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_loyalty_reward(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_reward(text) TO authenticated;
