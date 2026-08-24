/*
# Add psp column to subscriptions (multi-PSP support)

Adding PayUnit as a second payment provider alongside Flutterwave. Rather than rename
or duplicate flw_tx_ref (which would touch already-applied, working Flutterwave code
and data), this just tags each row with which PSP it went through. Both providers'
transaction references are stored in the same flw_tx_ref column — the name is a
historical artifact, not a Flutterwave-only constraint; nothing about the column type
or usage is Flutterwave-specific.
*/

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS psp text NOT NULL DEFAULT 'flutterwave' CHECK (psp IN ('flutterwave', 'payunit'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_psp ON public.subscriptions(psp);
