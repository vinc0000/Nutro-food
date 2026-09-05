/*
# Loyalty rewards were applying a $0 discount

## The bug
loyalty_settings.reward_value (the actual dollar amount a redeemed reward
takes off the order) was added in 20260830020000_discount_and_loyalty_priority.sql.
get_loyalty_balance() already does `SELECT * INTO v_settings FROM
loyalty_settings ...`, so v_settings.reward_value is available -- but the
function's jsonb_build_object() return never included it. The POS
(PosTerminal.tsx) reads loyaltyInfo.reward_value straight from this RPC's
response to compute the discount it applies on redemption; since the field
was simply absent from the JSON, it was always undefined there, and
`loyaltyInfo.reward_value ?? 0` silently fell back to 0.

Net effect: redeem_loyalty_reward() correctly deducted the customer's points
server-side (that function was never the problem), but the order total never
actually went down -- a customer who redeemed "Free coffee" for 100 points
lost the points and got nothing off their bill. Purely a missing field in one
RPC response; no schema or redemption-logic change needed.
*/

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
    'reward_value', v_settings.reward_value,
    'points_per_currency_unit', v_settings.points_per_currency_unit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_loyalty_balance(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_loyalty_balance(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_loyalty_balance(text) TO authenticated;
