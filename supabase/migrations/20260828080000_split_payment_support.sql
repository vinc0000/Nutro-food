/*
# Split payment support (cash + card, voucher, credit note)

payment_method was always a single value — there was no way to record an order
paid partly in cash and partly by card (or voucher, or a credit note), which is
routine in a real restaurant. Adds payment_split (nullable jsonb array of
{method, amount}) alongside the existing payment_method column rather than
replacing it: a normal single-method sale keeps working exactly as before
(payment_split stays null), and a split sale sets payment_method = 'split' with
payment_split holding the real breakdown, so per-method reporting (the X/Z
report's payment-method totals) can still attribute each portion correctly.
*/

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_split jsonb;
