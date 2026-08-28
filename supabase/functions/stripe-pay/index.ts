import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
};

const STRIPE_API_BASE = "https://api.stripe.com/v1";

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 29, annual: 290 },
  premium: { monthly: 69, annual: 690 },
  enterprise: { monthly: 189, annual: 1890 },
};

interface OrgContext {
  org_id: string;
  org_name: string;
  billing_email: string | null;
}

async function getOrgContext(supabase: ReturnType<typeof createClient>): Promise<OrgContext | null> {
  const { data, error } = await supabase.rpc("get_user_org_context");
  if (error) throw error;
  return (data as OrgContext | null) ?? null;
}

function stripeSecretKey() {
  return Deno.env.get("STRIPE_SECRET_KEY") ?? null;
}

// Encodes a JS object into Stripe's bracket-notation x-www-form-urlencoded body
// (Stripe's REST API does not accept JSON bodies). Only supports the shapes this
// file actually sends: flat values, and one level of nested objects/arrays, which
// is all a Checkout Session create call needs.
function toStripeForm(obj: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item && typeof item === "object") {
          parts.push(...toStripeForm(item as Record<string, unknown>, `${paramKey}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${paramKey}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      parts.push(...toStripeForm(value as Record<string, unknown>, paramKey));
    } else {
      parts.push(`${encodeURIComponent(paramKey)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

async function stripeRequest(path: string, secretKey: string, method: "GET" | "POST", body?: Record<string, unknown>) {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? toStripeForm(body).join("&") : undefined,
  });
  const data = await response.json();
  return { ok: response.ok, data };
}

// Manual Stripe webhook signature verification (HMAC-SHA256 of "{timestamp}.{rawBody}"),
// since the Deno edge runtime doesn't have the Stripe SDK available. Mirrors Stripe's own
// documented verification algorithm, including the 5-minute replay tolerance window.
async function verifyStripeSignature(rawBody: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=")).filter((kv) => kv.length === 2)
  ) as Record<string, string>;
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const macBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = Array.from(new Uint8Array(macBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === signature;
}

async function activateSubscription(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  sessionId: string,
  paymentIntentId: string | null
) {
  const { data: subscriptionRow, error: subLookupError } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("org_id", orgId)
    .eq("flw_tx_ref", sessionId)
    .eq("psp", "stripe")
    .maybeSingle();
  if (subLookupError) throw subLookupError;
  if (!subscriptionRow) return false;

  const updateResult = await supabase
    .from("subscriptions")
    .update({
      status: "successful",
      flw_tx_id: paymentIntentId,
      paid_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .eq("flw_tx_ref", sessionId)
    .eq("psp", "stripe");
  if (updateResult.error) throw updateResult.error;

  const orgUpdate = await supabase
    .from("organizations")
    .update({ plan: (subscriptionRow as { plan: string }).plan, plan_status: "active" })
    .eq("id", orgId);
  if (orgUpdate.error) throw orgUpdate.error;

  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Stripe's real webhook calls carry a `Stripe-Signature` header and are never sent by
    // a signed-in Nutro user — detect them by header, not by a body field, so this can
    // never be spoofed by simply adding an `action` field to a normal request.
    const stripeSignature = req.headers.get("stripe-signature");
    if (stripeSignature) {
      const rawBody = await req.text();
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      if (!webhookSecret) {
        return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isValid = await verifyStripeSignature(rawBody, stripeSignature, webhookSecret);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const event = JSON.parse(rawBody) as { type?: string; data?: { object?: Record<string, unknown> } };
      if (event.type === "checkout.session.completed") {
        const session = event.data?.object as Record<string, unknown> | undefined;
        const sessionId = session?.id as string | undefined;
        const orgId = (session?.metadata as Record<string, unknown> | undefined)?.org_id as string | undefined;
        const paymentStatus = session?.payment_status as string | undefined;
        const paymentIntentId = (session?.payment_intent as string | null | undefined) ?? null;
        if (sessionId && orgId && paymentStatus === "paid") {
          // Signature is already verified above — trusting the payload from here is
          // Stripe's own documented pattern for webhooks (unlike Flutterwave/PayUnit,
          // which only sign a hash and require a follow-up API re-fetch for integrity).
          await activateSubscription(supabase, orgId, sessionId, paymentIntentId);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, plan, billing_period, tx_ref, tenant_org_id } = body as {
      action?: string;
      plan?: string;
      billing_period?: string;
      tx_ref?: string;
      tenant_org_id?: string;
    };

    if (action === "status") {
      const authHeaderForStatus = req.headers.get("Authorization");
      if (!authHeaderForStatus) {
        return new Response(JSON.stringify({ error: "Missing auth header" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ configured: Boolean(stripeSecretKey()) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretKey = stripeSecretKey();
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Stripe is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // get_user_org_context() resolves the org via auth.uid() — calling it on the
    // service-role client above would run it as the service role itself (auth.uid()
    // = null there), never the real caller, so it would fail this lookup for every
    // real user. A second client, scoped to this specific request's own JWT, is what
    // makes auth.uid() actually resolve to the person who's paying.
    const supabaseAsUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const orgData = await getOrgContext(supabaseAsUser);
    if (!orgData?.org_id) {
      return new Response(JSON.stringify({ error: "Could not find organization context for this user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const orgId = orgData.org_id;
    const orgName = orgData.org_name || userData.user.email || "Nutro tenant";
    const billingEmail = orgData.billing_email || userData.user.email;

    if (tenant_org_id && tenant_org_id !== orgId) {
      return new Response(JSON.stringify({ error: "Tenant mismatch for this subscription request" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "initialize") {
      const normalizedPlan = plan?.toLowerCase();
      const prices = normalizedPlan ? PLAN_PRICES[normalizedPlan] : undefined;
      if (!normalizedPlan || !prices) {
        return new Response(JSON.stringify({ error: "Invalid plan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const period = billing_period === "annual" ? "annual" : "monthly";
      const amount = prices[period];
      // Same reasoning as flutterwave-pay/payunit-pay: Nutro's own subscription fee is
      // always billed in USD, independent of the tenant's own branches.currency.
      const currency = "USD";
      const appOrigin = req.headers.get("origin") || Deno.env.get("APP_BASE_URL") || "https://nutro.app";

      const { ok, data: session } = await stripeRequest("/checkout/sessions", secretKey, "POST", {
        mode: "payment",
        success_url: `${appOrigin}/app/admin/settings?billing=success`,
        cancel_url: `${appOrigin}/app/admin/settings?billing=cancelled`,
        client_reference_id: orgId,
        customer_email: billingEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: `Nutro ${normalizedPlan.charAt(0).toUpperCase() + normalizedPlan.slice(1)} plan (${period})`,
                description: `${orgName} — Nutro subscription`,
              },
            },
          },
        ],
        metadata: { org_id: orgId, plan: normalizedPlan, billing_period: period },
      });

      if (!ok || !session?.id || !session?.url) {
        return new Response(JSON.stringify({ error: session?.error?.message || "Failed to initialize payment" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // The Checkout Session's own id is used directly as our tx_ref — Stripe has no
      // reliable "look up session by client_reference_id" list filter, so reusing
      // Stripe's own identifier avoids inventing a second reference to reconcile.
      const insertResult = await supabase.from("subscriptions").insert({
        org_id: orgId,
        plan: normalizedPlan,
        amount,
        currency,
        flw_tx_ref: session.id,
        status: "pending",
        billing_period: period,
        psp: "stripe",
      } as never);
      if (insertResult.error) {
        return new Response(JSON.stringify({ error: "Failed to create subscription record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        payment_link: session.url,
        tx_ref: session.id,
        amount,
        currency,
        demo_mode: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!tx_ref) {
        return new Response(JSON.stringify({ error: "Missing payment reference" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { ok, data: session } = await stripeRequest(`/checkout/sessions/${encodeURIComponent(tx_ref)}`, secretKey, "GET");
      if (!ok) {
        return new Response(JSON.stringify({ error: session?.error?.message || "Could not verify payment" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sessionOrgId = (session?.metadata as Record<string, unknown> | undefined)?.org_id as string | undefined;
      // Never activate a plan for an org that doesn't match this session's own metadata —
      // this is what stops a tenant from taking someone else's tx_ref and self-verifying it.
      if (sessionOrgId !== orgId) {
        return new Response(JSON.stringify({ error: "This payment reference does not belong to your organization" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.payment_status === "paid") {
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
        const activated = await activateSubscription(supabase, orgId, tx_ref, paymentIntentId);
        if (!activated) {
          return new Response(JSON.stringify({ error: "No matching subscription found for this org" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: subscriptionRow } = await supabase
          .from("subscriptions")
          .select("plan")
          .eq("org_id", orgId)
          .eq("flw_tx_ref", tx_ref)
          .eq("psp", "stripe")
          .maybeSingle();

        return new Response(JSON.stringify({
          status: "successful",
          plan: (subscriptionRow as { plan: string } | null)?.plan ?? null,
          message: "Payment verified and tenant plan activated",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        status: "pending",
        message: "Payment not completed yet",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check") {
      const { data: latestSubscription, error: checkError } = await supabase
        .from("subscriptions")
        .select("plan, status, flw_tx_ref")
        .eq("org_id", orgId)
        .eq("psp", "stripe")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (checkError) {
        return new Response(JSON.stringify({ status: "unknown", message: "No subscription record found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        status: latestSubscription.status,
        plan: latestSubscription.plan,
        tx_ref: latestSubscription.flw_tx_ref,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
