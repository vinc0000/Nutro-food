import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Verification-Hash",
};

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 29, annual: 290 },
  premium: { monthly: 69, annual: 690 },
  enterprise: { monthly: 189, annual: 1890 },
};

interface OrgContext {
  org_id: string;
  org_name: string;
  billing_email: string | null;
  currency: string | null;
  plan: string | null;
  plan_status: string | null;
}

async function getOrgContext(supabase: ReturnType<typeof createClient>, userId: string): Promise<OrgContext | null> {
  const { data, error } = await supabase.rpc("get_user_org_context");
  if (error) throw error;
  return (data as OrgContext | null) ?? null;
}

async function updateSubscriptionStatus(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  txRef: string,
  updates: Record<string, unknown>
) {
  return await supabase
    .from("subscriptions")
    .update(updates)
    .eq("org_id", orgId)
    .eq("flw_tx_ref", txRef);
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

    const body = await req.json().catch(() => ({}));

    // --- Flutterwave webhook: this is called by Flutterwave's own servers, never by
    // a signed-in Nutro user, so it must NOT be gated behind our normal Supabase auth
    // check below. Instead it is authenticated using the secret hash Flutterwave sends
    // in the `verif-hash` header, which must match the hash configured in the
    // Flutterwave dashboard (FLW_WEBHOOK_HASH). Without this, anyone who knows a
    // pending tx_ref (which is handed back to the tenant themselves by `initialize`)
    // could call this action directly and self-activate a paid plan for free.
    if (body?.action === "webhook") {
      const webhookHash = Deno.env.get("FLW_WEBHOOK_HASH");
      const receivedHash = req.headers.get("verif-hash");
      if (!webhookHash || !receivedHash || receivedHash !== webhookHash) {
        return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = body as Record<string, unknown>;
      const data = payload?.data as Record<string, unknown> | undefined;
      const txRef = data?.tx_ref as string | undefined;
      const flwTransactionId = data?.id as string | number | undefined;
      const metaOrgId = (data?.meta as Record<string, unknown> | undefined)?.org_id as string | undefined;

      if (!txRef || !flwTransactionId || !metaOrgId) {
        return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Never trust the payload's own status field for something that unlocks paid
      // access — re-verify the transaction directly against Flutterwave's API using
      // our secret key, which only Flutterwave and Nutro's backend know.
      const flwSecretKey = Deno.env.get("FLW_SECRET_KEY");
      if (!flwSecretKey) {
        return new Response(JSON.stringify({ error: "Payments are not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verifyResponse = await fetch(
        `https://api.flutterwave.com/v3/transactions/${flwTransactionId}/verify`,
        { headers: { Authorization: `Bearer ${flwSecretKey}` } }
      );
      const verifyData = await verifyResponse.json();
      const isSuccessful =
        verifyData.status === "success" &&
        verifyData.data?.status === "successful" &&
        verifyData.data?.tx_ref === txRef;

      if (isSuccessful) {
        const subscriptionLookup = await supabase
          .from("subscriptions")
          .select("plan")
          .eq("org_id", metaOrgId)
          .eq("flw_tx_ref", txRef)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (subscriptionLookup.error) throw subscriptionLookup.error;

        await updateSubscriptionStatus(supabase, metaOrgId, txRef, {
          status: "successful",
          flw_tx_id: String(flwTransactionId),
          paid_at: new Date().toISOString(),
        });
        await supabase.from("organizations").update({
          plan: subscriptionLookup.data?.plan ?? "starter",
          plan_status: "active",
        }).eq("id", metaOrgId);
      } else if (txRef) {
        await updateSubscriptionStatus(supabase, metaOrgId, txRef, { status: "failed" });
      }

      return new Response(JSON.stringify({ status: "received" }), {
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

    const { action, plan, billing_period, tx_ref, transaction_id, tenant_org_id } = body as {
      action?: string;
      plan?: string;
      billing_period?: string;
      tx_ref?: string;
      transaction_id?: string;
      tenant_org_id?: string;
    };

    if (action === "status") {
      return new Response(JSON.stringify({ configured: Boolean(Deno.env.get("FLW_SECRET_KEY")) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgData = await getOrgContext(supabase, userData.user.id);
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
      // Same reasoning as payunit-pay: Nutro's own subscription fee is always billed
      // in USD, independent of the tenant's own branches.currency (used for their
      // customers' orders, a separate concern).
      const currency = "USD";
      const txRef = `nutro-${normalizedPlan}-${Date.now()}`;

      const { error: subError } = await supabase.from("subscriptions").insert({
        org_id: orgId,
        plan: normalizedPlan,
        amount,
        currency,
        flw_tx_ref: txRef,
        status: "pending",
        billing_period: period,
      });

      if (subError) {
        return new Response(JSON.stringify({ error: "Failed to create subscription record" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const flwSecretKey = Deno.env.get("FLW_SECRET_KEY");
      if (!flwSecretKey) {
        return new Response(JSON.stringify({
          error: "Flutterwave is not configured yet. Using local demo mode for billing flow.",
          tx_ref: txRef,
          amount,
          currency,
          payment_link: `https://demo.nutro.app/billing/${txRef}`,
          demo_mode: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const flwResponse = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${flwSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: amount.toString(),
          currency,
          payment_options: "card, mobilemoney, ussd, banktransfer",
          customer: {
            email: billingEmail,
            name: orgName,
          },
          customizations: {
            title: "Nutro Subscription",
            description: `${normalizedPlan.charAt(0).toUpperCase() + normalizedPlan.slice(1)} plan - ${period}`,
            logo: "https://nutro.app/logo.png",
          },
          meta: {
            org_id: orgId,
            plan: normalizedPlan,
            billing_period: period,
            tenant_isolation: true,
          },
        }),
      });

      const flwData = await flwResponse.json();
      if (flwData.status === "success") {
        return new Response(JSON.stringify({
          payment_link: flwData.data.link,
          tx_ref: txRef,
          amount,
          currency,
          demo_mode: false,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        error: "Failed to initialize payment",
        details: flwData.message,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const verificationTxRef = typeof tx_ref === "string" ? tx_ref : null;
      const verificationTransactionId = typeof transaction_id === "string" ? transaction_id : null;
      if (!verificationTxRef && !verificationTransactionId) {
        return new Response(JSON.stringify({ error: "Missing payment reference" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const flwSecretKey = Deno.env.get("FLW_SECRET_KEY");
      if (!flwSecretKey) {
        return new Response(JSON.stringify({
          status: "successful",
          plan: plan ?? null,
          message: "Local demo mode: payment flow accepted for this tenant.",
          demo_mode: true,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verifyUrl = verificationTransactionId
        ? `https://api.flutterwave.com/v3/transactions/${verificationTransactionId}/verify`
        : verificationTxRef
          ? `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(verificationTxRef)}`
          : "";

      const verifyResponse = await fetch(verifyUrl, {
        headers: { Authorization: `Bearer ${flwSecretKey}` },
      });
      const verifyData = await verifyResponse.json();
      const isSuccessful = verifyData.status === "success" && verifyData.data?.status === "successful";

      if (isSuccessful) {
        const txRefToUpdate = verificationTxRef ?? verifyData.data?.tx_ref?.toString() ?? null;
        if (!txRefToUpdate) {
          return new Response(JSON.stringify({ error: "Missing transaction reference" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // The plan to activate must come from OUR OWN record of what was actually
        // initialized/paid for (written server-side in `initialize`), never from the
        // client-supplied `plan` field — otherwise a tenant could pay for Starter and
        // ask us to activate Enterprise just by editing the request body.
        const { data: subscriptionRow, error: subLookupError } = await supabase
          .from("subscriptions")
          .select("plan")
          .eq("org_id", orgId)
          .eq("flw_tx_ref", txRefToUpdate)
          .maybeSingle();
        if (subLookupError) throw subLookupError;
        if (!subscriptionRow) {
          return new Response(JSON.stringify({ error: "No matching subscription found for this org" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const activePlan = subscriptionRow.plan as string;
        const planStatusValue = "active";
        const updateResult = await updateSubscriptionStatus(supabase, orgId, txRefToUpdate, {
          status: "successful",
          flw_tx_id: verificationTransactionId?.toString() ?? verifyData.data?.id?.toString() ?? null,
          paid_at: new Date().toISOString(),
        });

        if (updateResult.error) throw updateResult.error;

        const orgUpdate = await supabase.from("organizations").update({
          plan: activePlan,
          plan_status: planStatusValue,
        }).eq("id", orgId);
        if (orgUpdate.error) throw orgUpdate.error;

        return new Response(JSON.stringify({
          status: "successful",
          plan: activePlan,
          message: "Payment verified and tenant plan activated",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (verificationTxRef) {
        await updateSubscriptionStatus(supabase, orgId, verificationTxRef, { status: "failed" });
      }

      return new Response(JSON.stringify({
        status: "failed",
        message: verifyData.data?.processor_response || "Payment verification failed",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check") {
      const { data: latestSubscription, error: checkError } = await supabase
        .from("subscriptions")
        .select("plan, status, flw_tx_ref")
        .eq("org_id", orgId)
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
