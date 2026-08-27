import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Paystack-Signature",
};

const PAYSTACK_BASE_URL = "https://api.paystack.co";

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

function paystackSecretKey() {
  return Deno.env.get("PAYSTACK_SECRET_KEY") ?? null;
}

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Paystack signs webhook bodies with HMAC-SHA512 of the raw request body, keyed with
// your own secret key (no separate webhook secret, per Paystack's documented scheme) —
// verify by recomputing the same digest rather than trusting the payload at face value.
async function verifyPaystackSignature(rawBody: string, signatureHeader: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const macBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return bytesToHex(macBuffer) === signatureHeader;
}

async function activateSubscription(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  reference: string,
  paystackTransactionId: string | null
) {
  const { data: subscriptionRow, error: subLookupError } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("org_id", orgId)
    .eq("flw_tx_ref", reference)
    .eq("psp", "paystack")
    .maybeSingle();
  if (subLookupError) throw subLookupError;
  if (!subscriptionRow) return false;

  const updateResult = await supabase
    .from("subscriptions")
    .update({
      status: "successful",
      flw_tx_id: paystackTransactionId,
      paid_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .eq("flw_tx_ref", reference)
    .eq("psp", "paystack");
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

    // Paystack's real webhook calls carry an `X-Paystack-Signature` header and are never
    // sent by a signed-in Nutro user — detect them by header, never by a client-suppliable
    // body field, so this path can't be triggered by anyone but Paystack itself.
    const paystackSignature = req.headers.get("x-paystack-signature");
    if (paystackSignature) {
      const rawBody = await req.text();
      const secretKey = paystackSecretKey();
      if (!secretKey) {
        return new Response(JSON.stringify({ error: "Payments are not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const isValid = await verifyPaystackSignature(rawBody, paystackSignature, secretKey);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const event = JSON.parse(rawBody) as { event?: string; data?: Record<string, unknown> };
      if (event.event === "charge.success") {
        const data = event.data ?? {};
        const reference = data.reference as string | undefined;
        const orgId = (data.metadata as Record<string, unknown> | undefined)?.org_id as string | undefined;
        const status = data.status as string | undefined;
        const transactionId = data.id != null ? String(data.id) : null;
        if (reference && orgId && status === "success") {
          // Signature already verified above — trusting the payload here is Paystack's
          // own documented webhook pattern.
          await activateSubscription(supabase, orgId, reference, transactionId);
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
      return new Response(JSON.stringify({ configured: Boolean(paystackSecretKey()) }), {
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

    const secretKey = paystackSecretKey();
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Paystack is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgData = await getOrgContext(supabase);
    if (!orgData?.org_id) {
      return new Response(JSON.stringify({ error: "Could not find organization context for this user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const orgId = orgData.org_id;
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
      // Same reasoning as the other PSP functions: Nutro's own subscription fee is
      // always billed in USD, independent of the tenant's own branches.currency.
      const currency = "USD";
      const txRef = `PS-${orgId.slice(0, 8)}-${Date.now()}`;
      const appOrigin = req.headers.get("origin") || Deno.env.get("APP_BASE_URL") || "https://nutro.app";

      const initResponse = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: billingEmail,
          amount: Math.round(amount * 100),
          currency,
          reference: txRef,
          callback_url: `${appOrigin}/app/admin/settings?billing=success`,
          metadata: { org_id: orgId, plan: normalizedPlan, billing_period: period },
        }),
      });
      const initData = await initResponse.json();

      if (!initData.status || !initData.data?.authorization_url) {
        return new Response(JSON.stringify({ error: initData.message || "Could not initialize Paystack checkout" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insertResult = await supabase.from("subscriptions").insert({
        org_id: orgId,
        plan: normalizedPlan,
        amount,
        currency,
        flw_tx_ref: txRef,
        status: "pending",
        billing_period: period,
        psp: "paystack",
      } as never);
      if (insertResult.error) {
        return new Response(JSON.stringify({ error: "Failed to create subscription record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        payment_link: initData.data.authorization_url,
        tx_ref: txRef,
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

      const verifyResponse = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(tx_ref)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const verifyData = await verifyResponse.json();
      const data = verifyData?.data as Record<string, unknown> | undefined;
      const remoteOrgId = (data?.metadata as Record<string, unknown> | undefined)?.org_id as string | undefined;

      // Never activate a plan for an org that doesn't match this transaction's own
      // metadata — stops a tenant from taking someone else's tx_ref and self-verifying it.
      if (remoteOrgId !== orgId) {
        return new Response(JSON.stringify({ error: "This payment reference does not belong to your organization" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isSuccessful = verifyData.status === true && data?.status === "success";

      if (isSuccessful) {
        const transactionId = data?.id != null ? String(data.id) : null;
        const activated = await activateSubscription(supabase, orgId, tx_ref, transactionId);
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
          .eq("psp", "paystack")
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

      if (data?.status === "failed" || data?.status === "abandoned") {
        await supabase.from("subscriptions").update({ status: "failed" }).eq("org_id", orgId).eq("flw_tx_ref", tx_ref).eq("psp", "paystack");
      }

      return new Response(JSON.stringify({
        status: "pending",
        message: (data?.gateway_response as string | undefined) || "Payment not completed yet",
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
        .eq("psp", "paystack")
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
