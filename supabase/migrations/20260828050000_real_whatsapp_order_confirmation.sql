/*
# Make the WhatsApp Business integration actually send messages

## What was missing
1. `orders` had no column to hold a customer's phone number at all — so even a
   correct WhatsApp integration would have had nobody to message.
2. The Connect form only collected a Cloud API access token. Meta's WhatsApp
   Cloud API also requires a `phone_number_id` (which of your registered
   WhatsApp numbers to send from) to call POST /{phone_number_id}/messages,
   and any business-initiated message outside a customer-started 24h window
   must use a pre-approved message *template* (a free-text `type: text` send
   is rejected by Meta outside that window) — neither was collected.

## What this does
- Adds `orders.customer_phone` (nullable — most orders still won't have one;
  dine-in orders taken by a cashier typically don't need it, but a takeaway/
  delivery order can now optionally record one).
- Extends the same order-insert trigger that already dispatches the Custom
  Webhook to also send a real WhatsApp Cloud API request when: the org has a
  `whatsapp` integration row that's enabled, its `config` jsonb has both
  `phone_number_id` and `template_name` set (added to `config`, not `api_key`,
  which continues to hold the access token — see Integrations.tsx), and this
  order has a non-empty `customer_phone`. Calls
  https://graph.facebook.com/v21.0/{phone_number_id}/messages with a
  `type: template` body (order number + total as template parameters),
  matching Meta's actual documented requirement for business-initiated sends.
- This is a real HTTP call to Meta's real API. It will only succeed once the
  tenant has: a Meta Business/WhatsApp Cloud API account, a real access token,
  their real phone_number_id, and a template approved in Meta Business Manager
  with that exact name and two body parameters ({{1}} order number, {{2}}
  total) — same as any other real WhatsApp Cloud API integration anywhere.
  Fire-and-forget via pg_net, same as the webhook: never blocks order
  creation, and a bad/unapproved template just means that one send fails
  silently rather than breaking checkout.
*/

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;

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
  v_wa_token text;
  v_wa_phone_number_id text;
  v_wa_template text;
BEGIN
  SELECT b.org_id, b.name, o.name
    INTO v_org_id, v_branch_name, v_org_name
    FROM public.branches b
    JOIN public.organizations o ON o.id = b.org_id
    WHERE b.id = NEW.branch_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Custom Webhook (unchanged from the previous migration)
  SELECT api_key INTO v_webhook_url
    FROM public.integrations
    WHERE org_id = v_org_id AND provider = 'webhook' AND enabled = true
    LIMIT 1;

  IF v_webhook_url IS NOT NULL AND v_webhook_url <> '' THEN
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
  END IF;

  -- WhatsApp Business Cloud API order confirmation
  IF NEW.customer_phone IS NOT NULL AND NEW.customer_phone <> '' THEN
    SELECT api_key, config->>'phone_number_id', config->>'template_name'
      INTO v_wa_token, v_wa_phone_number_id, v_wa_template
      FROM public.integrations
      WHERE org_id = v_org_id AND provider = 'whatsapp' AND enabled = true
      LIMIT 1;

    IF v_wa_token IS NOT NULL AND v_wa_token <> ''
       AND v_wa_phone_number_id IS NOT NULL AND v_wa_phone_number_id <> ''
       AND v_wa_template IS NOT NULL AND v_wa_template <> '' THEN
      PERFORM extensions.http_post(
        url := 'https://graph.facebook.com/v21.0/' || v_wa_phone_number_id || '/messages',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_wa_token),
        body := jsonb_build_object(
          'messaging_product', 'whatsapp',
          'to', NEW.customer_phone,
          'type', 'template',
          'template', jsonb_build_object(
            'name', v_wa_template,
            'language', jsonb_build_object('code', 'en_US'),
            'components', jsonb_build_array(
              jsonb_build_object(
                'type', 'body',
                'parameters', jsonb_build_array(
                  jsonb_build_object('type', 'text', 'text', NEW.order_number),
                  jsonb_build_object('type', 'text', 'text', to_char(NEW.total_amount, 'FM999999990.00'))
                )
              )
            )
          )
        )
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A misconfigured integration must never block order creation itself.
  RETURN NEW;
END;
$$;
