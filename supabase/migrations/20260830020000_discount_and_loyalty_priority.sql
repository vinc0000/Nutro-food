/*
# Manual discount (manager-approved) + loyalty redemption, with configurable priority

## What this adds
- orders.discount_reason (text, nullable) and orders.discount_approved_by (uuid,
  nullable, references profiles) — real accountability for every manual discount:
  who approved it and why, not just a number. discount_amount itself already
  existed on orders; these two columns give it context.
- loyalty_settings.reward_value (numeric, default 0): the actual $ amount a
  redeemed reward discounts off the order. reward_description stays as the
  free-text label shown to staff/customer (e.g. "Free coffee") — this is what
  lets redeem_loyalty_reward's result actually translate into a real discount
  at the POS instead of just a description with no attached value.
- loyalty_settings.discount_priority (text, default 'both', CHECK IN
  ('discount', 'loyalty', 'both')): which option(s) the POS offers when
  applying a price reduction — manual discount only (manager-approved), loyalty
  points only, or both. Matches "priorité (remise manuelle avec approbation
  manager / points fidélité / les deux)".
*/

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.loyalty_settings ADD COLUMN IF NOT EXISTS reward_value numeric NOT NULL DEFAULT 0 CHECK (reward_value >= 0);
ALTER TABLE public.loyalty_settings ADD COLUMN IF NOT EXISTS discount_priority text NOT NULL DEFAULT 'both' CHECK (discount_priority IN ('discount', 'loyalty', 'both'));
