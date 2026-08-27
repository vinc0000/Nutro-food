/*
# Close a fake-data injection vector on subscriptions

## The issue
The frontend never inserts into subscriptions directly — every real write happens
inside payunit-pay/flutterwave-pay using the service role key, which bypasses RLS
entirely regardless of what client-facing policies exist (verified: every
.from('subscriptions') call in the codebase is a SELECT, none is an INSERT). That
means insert_own_subscriptions served no legitimate purpose, but did let any tenant
insert a fake row into their own org's subscription history directly via the
Supabase JS client — e.g. status: 'successful' with a made-up amount.

Not a privilege-escalation risk on its own: nothing auto-grants plan access from
this table, only the edge functions do that, after real PSP verification. But it's
real pollution of what's supposed to be a trustworthy financial record — one that's
now displayed on multiple real Super Admin pages (Financials, Subscriptions,
Report, the notification feed). Confirmed by directly testing against the live
database that the insert is rejected after this fix.

## The fix
Drop the policy entirely. Legitimate writes are unaffected since they never went
through it in the first place.
*/

DROP POLICY IF EXISTS "insert_own_subscriptions" ON public.subscriptions;

/*
# Restrict orders UPDATE to safe operational columns only

orders_update's RLS check only verifies branch membership, not which columns are
being touched — meaning any branch staff member (cashier, kitchen staff, waiter,
not just owner/manager) could directly UPDATE financial columns like
refund_amount, payment_status, or total_amount, completely bypassing
refund_order()'s careful role/amount checks. The app itself only ever updates
{status, payment_status, payment_method, notes, updated_at} via this path
(verified against every ordersStore.ts / PosTerminal.tsx / KDS call site) —
refunds go through refund_order() (SECURITY DEFINER), never a raw update.

Column-level GRANTs are enforced alongside RLS (both must pass), so this closes
the gap without touching the RLS policy itself: financial/audit columns can now
only ever be changed by SECURITY DEFINER functions (which run as their owner,
not the authenticated role), never by a direct client update no matter what role
a staff member holds. Verified directly against the live database.
*/

REVOKE UPDATE ON public.orders FROM authenticated;
GRANT UPDATE (status, payment_status, payment_method, notes, updated_at) ON public.orders TO authenticated;

/*
# CRITICAL: any tenant owner could grant themselves a paid plan for free

organizations_update let any tenant owner (owner_id = auth.uid()) UPDATE every
column on their own organization row, including plan, plan_status, and
trial_ends_at — with no restriction on which columns changed. Any restaurant
owner could open browser devtools and run:

  supabase.from('organizations').update({ plan: 'enterprise', plan_status: 'active' }).eq('id', myOrgId)

...and grant themselves paid-tier access for free, permanently, with zero payment.

Verified no legitimate tenant-facing code path ever writes to organizations at
all (grepped every .from('organizations') call in the codebase outside
super-admin pages — all reads). Every real write is either a Super Admin action
(Tenants.tsx, already gated by is_super_admin) or inside the payment edge
functions (service role, bypasses RLS entirely regardless of this policy).

Fix: restrict UPDATE to super admins only. Removes the owner_id branch entirely
since it had no legitimate use and was a direct, exploitable revenue bypass.
Verified directly against the live database (policy now reads is_super_admin(auth.uid())
only).
*/

DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
CREATE POLICY "organizations_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
