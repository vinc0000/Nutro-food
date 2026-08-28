/*
# Stripe/Paystack subscriptions were guaranteed to fail — blocked by a stale check constraint

subscriptions_psp_check only allowed 'flutterwave'/'payunit'. Stripe and Paystack
support was added (stripe-pay/paystack-pay edge functions, Settings.tsx's PSP
picker) but every real subscription insert through either of them would fail this
constraint, since neither 'stripe' nor 'paystack' was ever added to the allowed
list — the two new edge functions were also never actually deployed until now,
found and fixed together.
*/

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_psp_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_psp_check
  CHECK (psp = ANY (ARRAY['flutterwave', 'payunit', 'stripe', 'paystack']));
