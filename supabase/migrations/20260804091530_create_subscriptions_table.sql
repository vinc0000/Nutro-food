/*
# Create subscriptions and payments tables

## Purpose
Track Flutterwave subscription payments and plan changes for organizations.

## New Tables
- `subscriptions`: Records each payment/subscription event for an org.
  - `org_id`: which org paid
  - `plan`: which plan they subscribed to (starter/premium/enterprise)
  - `amount`: amount paid
  - `currency`: payment currency
  - `flw_tx_ref`: Flutterwave transaction reference
  - `flw_tx_id`: Flutterwave transaction ID (after verification)
  - `status`: pending, successful, failed, cancelled
  - `billing_period`: monthly or annual
  - `paid_at`: when payment was confirmed

## Security
- RLS enabled on both tables.
- Only org members can read their own subscriptions.
- Only authenticated users can insert (via edge function with service role).
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  plan text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  flw_tx_ref text,
  flw_tx_id text,
  status text NOT NULL DEFAULT 'pending',
  billing_period text NOT NULL DEFAULT 'monthly',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscriptions" ON subscriptions;
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = auth.uid() AND org_id = subscriptions.org_id)
  );

DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_org_roles WHERE user_id = auth.uid() AND org_id = subscriptions.org_id)
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_flw_tx_ref ON subscriptions(flw_tx_ref);
