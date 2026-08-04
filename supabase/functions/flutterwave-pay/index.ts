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
  org: string;
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

    const body = await req.json().catch(() => ({}));
    const { action, plan, billing_period, tx_ref, transaction_id } = body as {
      action?: string;
      plan?: string;
      billing_period?: string;
      tx_ref?: string;
      transaction_id?: string;
    };

    const orgData = await getOrgContext(supabase, userData.user.id);
    if (!orgData?.org) {
      return new Response(JSON.stringify({ error: "Could not find organization context for this user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = orgData.org;
    const orgName = orgData.org_name || userData.user.email || "Nutro tenant";
    const billingEmail = orgData.billing_email || userData.user.email;

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
      const currency = orgData.currency || "USD";
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
      const verificationTxRef = tx_ref ?? null;
      const verificationTransactionId = transaction_id ?? null;
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
        : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(verificationTxRef)}`;

      const verifyResponse = await fetch(verifyUrl, {
        headers: { Authorization: `Bearer ${flwSecretKey}` },
      });
      const verifyData = await verifyResponse.json();
      const isSuccessful = verifyData.status === "success" && verifyData.data?.status === "successful";

      if (isSuccessful) {
        const activePlan = (plan ?? verifyData.data?.meta?.plan ?? "starter").toLowerCase();
        const planStatusValue = "active";
        const updateResult = await updateSubscriptionStatus(supabase, orgId, verificationTxRef, {
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

    if (action === "webhook") {
      const payload = body as Record<string, unknown>;
      const txRef = (payload?.data as Record<string, unknown> | undefined)?.tx_ref as string | undefined;
      const incomingStatus = (payload?.data as Record<string, unknown> | undefined)?.status as string | undefined;
      if (!txRef || !incomingStatus) {
        return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (incomingStatus === "successful") {
        const subscriptionLookup = await supabase
          .from("subscriptions")
          .select("plan")
          .eq("org_id", orgId)
          .eq("flw_tx_ref", txRef)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (subscriptionLookup.error) throw subscriptionLookup.error;
        await updateSubscriptionStatus(supabase, orgId, txRef, { status: "successful", paid_at: new Date().toISOString() });
        await supabase.from("organizations").update({ plan: subscriptionLookup.data?.plan ?? "starter", plan_status: "active" }).eq("id", orgId);
      }

      return new Response(JSON.stringify({ status: "received" }), {
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
