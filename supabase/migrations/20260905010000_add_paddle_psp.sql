-- Adds Paddle as a 5th supported payment service provider, alongside the
-- existing flutterwave/payunit/stripe/paystack. This only widens the
-- constraint so the paddle-pay edge function can insert/update rows with
-- psp = 'paddle' -- it does not change any existing row, and does nothing
-- on its own until PADDLE_API_KEY / PADDLE_WEBHOOK_SECRET are configured
-- as edge function secrets (the paddle-pay function's `status` action
-- returns configured:false until then, exactly like the other PSPs before
-- their keys are set, so this is safe to ship ahead of the keys).
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_psp_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_psp_check
  CHECK (psp = ANY (ARRAY['flutterwave', 'payunit', 'stripe', 'paystack', 'paddle']));
