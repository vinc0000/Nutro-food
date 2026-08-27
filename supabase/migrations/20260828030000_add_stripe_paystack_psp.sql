/*
# Add Stripe and Paystack as supported PSPs

Extends the subscriptions.psp CHECK constraint (previously only 'flutterwave' and
'payunit') to also allow 'stripe' and 'paystack', matching the new stripe-pay and
paystack-pay edge functions. Same non-destructive pattern as the earlier
20260823050000_subscriptions_psp_column.sql migration: widen the constraint only,
touching no existing rows or code paths for the already-working PSPs.
*/

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_psp_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_psp_check
  CHECK (psp IN ('flutterwave', 'payunit', 'stripe', 'paystack'));
