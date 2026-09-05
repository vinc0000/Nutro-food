import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Paddle-Signature",
};

// Paddle Billing (v2) API. Sandbox and live use different hosts and different
// API keys/client tokens — PADDLE_ENV picks which one this function talks to.
// Defaults to sandbox so a half-configured deployment can never accidentally
// bill a real card before someone deliberately sets PADDLE_ENV=live.
function paddleApiBase() {
  return Deno.env.get("PADDLE_ENV") === "live"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

// Real Paddle price IDs (pri_...) are created once in the Paddle Dashboard
// (Catalog > Prices) and pasted in as edge function secrets — there is no way
// to create a "plan" purely from a name/amount the way Stripe's Checkout
// Sessions allow, so unlike stripe-pay this cannot compute a price on the fly.
// Until these are set, `initialize` fails with a clear "not configured"
// message instead of silently charging the wrong amount.
function paddlePriceId(plan: string, period: "monthly" | "annual"): string | null {
  const key = `PADDLE_PRICE_${plan.toUpperCase()}_${period.toUpperCase()}`;
  return Deno.env.get(key) ?? null;
}

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

function paddleApiKey() {
  return Deno.env.get("PADDLE_API_KEY") ?? null;
}

async function paddleRequest(path: string, apiKey: string, method: "GET" | "POST", body?: Record<string, unknown>) {
  const response = await fetch(`${paddleApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return { ok: response.ok, data };
}

// Paddle signs webhooks as "Paddle-Signature: ts=<unix_ts>;h1=<hmac>", where h1
// is HMAC-SHA256 of "<ts>:<raw_body>" using the per-notification-destination
// endpoint secret (PADDLE_WEBHOOK_SECRET). Mirrors stripe-pay's own manual
// verification for the same reason: no Paddle SDK is available in the Deno
// edge runtime. Do not parse/reformat rawBody before this check — any
// re-serialization changes the bytes and breaks the signature.
async function verifyPaddleSignature(rawBody: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(
    sigHeader.split(";").map((kv) => kv.split("=")).filter((kv) => kv.length === 2)
  ) as Record<string, string>;
  const timestamp = parts["ts"];
  const signature = parts["h1"];
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
  const macBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}:${rawBody}`));
  const expected = Array.from(new Uint8Array(macBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === signature;
}

async function activateSubscription(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  transactionId: string
) {
  const { data: subscriptionRow, error: subLookupError } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("org_id", orgId)
    .eq("flw_tx_ref", transactionId)
    .eq("psp", "paddle")
    .maybeSingle();
  if (subLookupError) throw subLookupError;
  if (!subscriptionRow) return false;

  const updateResult = await supabase
    .from("subscriptions")
    .update({ status: "successful", paid_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("flw_tx_ref", transactionId)
    .eq("psp", "paddle");
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

    // Real Paddle webhook calls carry a Paddle-Signature header and are never
    // sent by a signed-in Nutro user — detected by header, same pattern as
    // stripe-pay, so this path can't be spoofed by adding a fake body field.
    const paddleSignature = req.headers.get("paddle-signature");
    if (paddleSignature) {
      const rawBody = await req.text();
      const webhookSecret = Deno.env.get("PADDLE_WEBHOOK_SECRET");
      if (!webhookSecret) {
        return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isValid = await verifyPaddleSignature(rawBody, paddleSignature, webhookSecret);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const event = JSON.parse(rawBody) as {
        event_type?: string;
        data?: { id?: string; status?: string; custom_data?: Record<string, unknown> | null };
      };
      if (event.event_type === "transaction.completed") {
        const txn = event.data;
        const transactionId = txn?.id;
        const orgId = txn?.custom_data?.org_id as string | undefined;
        if (transactionId && orgId) {
          await activateSubscription(supabase, orgId, transactionId);
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
      return new Response(JSON.stringify({ configured: Boolean(paddleApiKey()) }), {
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

    const apiKey = paddleApiKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Paddle is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      const period = billing_period === "annual" ? "annual" : "monthly";
      const priceId = normalizedPlan ? paddlePriceId(normalizedPlan, period) : null;
      if (!normalizedPlan || !priceId) {
        return new Response(JSON.stringify({
          error: `Paddle price ID not configured for ${normalizedPlan ?? "this plan"} (${period}). Set PADDLE_PRICE_${(normalizedPlan ?? "PLAN").toUpperCase()}_${period.toUpperCase()} as an Edge Function secret once the price exists in the Paddle Dashboard.`,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Paddle Billing has no "hosted redirect URL" the way Stripe Checkout
      // Sessions do — the transaction is created server-side, then the
      // frontend opens Paddle.js's own overlay checkout with this
      // transaction id (see src/lib/paddle.ts). custom_data.org_id is what
      // the webhook above reads back to know which tenant to activate.
      const { ok, data: transaction } = await paddleRequest("/transactions", apiKey, "POST", {
        items: [{ price_id: priceId, quantity: 1 }],
        customer_email: billingEmail,
        custom_data: { org_id: orgId, plan: normalizedPlan, billing_period: period },
      });

      if (!ok || !transaction?.data?.id) {
        return new Response(JSON.stringify({ error: transaction?.error?.detail || "Failed to initialize Paddle transaction" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const transactionId = transaction.data.id as string;
      const amount = normalizedPlan === "starter" ? 29 : normalizedPlan === "premium" ? 69 : 189;

      const insertResult = await supabase.from("subscriptions").insert({
        org_id: orgId,
        plan: normalizedPlan,
        amount: period === "annual" ? amount * 10 : amount,
        currency: "USD",
        flw_tx_ref: transactionId,
        status: "pending",
        billing_period: period,
        psp: "paddle",
      } as never);
      if (insertResult.error) {
        return new Response(JSON.stringify({ error: "Failed to create subscription record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // No payment_link here on purpose — unlike the redirect-based PSPs,
      // the frontend uses transaction_id to open Paddle.js's overlay in-page.
      return new Response(JSON.stringify({
        transaction_id: transactionId,
        tx_ref: transactionId,
        org_name: orgName,
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

      const { ok, data: transaction } = await paddleRequest(`/transactions/${encodeURIComponent(tx_ref)}`, apiKey, "GET");
      if (!ok) {
        return new Response(JSON.stringify({ error: transaction?.error?.detail || "Could not verify payment" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const txnOrgId = transaction?.data?.custom_data?.org_id as string | undefined;
      if (txnOrgId !== orgId) {
        return new Response(JSON.stringify({ error: "This payment reference does not belong to your organization" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const status = transaction?.data?.status as string | undefined;
      if (status === "completed" || status === "paid") {
        const activated = await activateSubscription(supabase, orgId, tx_ref);
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
          .eq("psp", "paddle")
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

      return new Response(JSON.stringify({ status: "pending", message: "Payment not completed yet" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check") {
      const { data: latestSubscription, error: checkError } = await supabase
        .from("subscriptions")
        .select("plan, status, flw_tx_ref")
        .eq("org_id", orgId)
        .eq("psp", "paddle")
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
