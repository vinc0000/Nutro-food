/*
# Make the "Custom Webhook" integration actually fire

## The gap
Admin > Integrations lets a tenant "connect" Atlas CRM, LiBooks, WhatsApp, or a
Custom Webhook by pasting an API key/URL into the `integrations` table. Nothing
else in the codebase ever reads that table — no edge function, no trigger, no
client-side consumer. All four are cosmetic: the UI says "connected" and stores
a value, but no order confirmation, CRM sync, or webhook call ever actually
happens. This migration makes the Custom Webhook one real end-to-end, since it's
the one integration here with a simple, generic, fully-documented target (any
plain HTTP endpoint — Zapier/Make/n8n/their own server) that doesn't depend on
a third-party API contract this migration would otherwise have to guess at.

Atlas CRM, LiBooks and WhatsApp Business are deliberately left as-is (storing a
key with no consumer) rather than half-built: Atlas CRM and LiBooks are
LiAfrik's own other products with no API spec available here to integrate
against correctly, and WhatsApp's Cloud API needs a phone_number_id the current
form doesn't even collect alongside the token. Wiring those up for real needs
their API docs/credentials, not a guess.

## What this does
Enables pg_net (Supabase's built-in async HTTP-from-Postgres extension) and adds
an AFTER INSERT trigger on `orders`: for the order's org, if a `webhook`
integration row exists with enabled = true and a non-empty api_key column (used
here to hold the destination URL, matching how Integrations.tsx already stores
it), POST a JSON payload describing the new order to it. Fire-and-forget via
pg_net — a slow or failing destination never blocks or fails the order itself.
*/

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_order_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_org_id uuid;
  v_webhook_url text;
  v_org_name text;
  v_branch_name text;
BEGIN
  SELECT b.org_id, b.name, o.name
    INTO v_org_id, v_branch_name, v_org_name
    FROM public.branches b
    JOIN public.organizations o ON o.id = b.org_id
    WHERE b.id = NEW.branch_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT api_key INTO v_webhook_url
    FROM public.integrations
    WHERE org_id = v_org_id AND provider = 'webhook' AND enabled = true
    LIMIT 1;

  IF v_webhook_url IS NULL OR v_webhook_url = '' THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := v_webhook_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Nutro-Event', 'order.created'),
    body := jsonb_build_object(
      'event', 'order.created',
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'order_type', NEW.order_type,
      'status', NEW.status,
      'subtotal', NEW.subtotal,
      'tax_amount', NEW.tax_amount,
      'discount_amount', NEW.discount_amount,
      'total_amount', NEW.total_amount,
      'payment_status', NEW.payment_status,
      'created_at', NEW.created_at,
      'organization', v_org_name,
      'branch', v_branch_name
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A malformed/unreachable webhook URL must never block order creation itself.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_order_webhook ON public.orders;
CREATE TRIGGER trg_notify_order_webhook
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_webhook();
