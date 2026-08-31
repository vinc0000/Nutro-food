import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PAYUNIT_BASE_URL = "https://gateway.payunit.net";

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
  country: string | null;
}

// PayUnit is an African mobile money aggregator (MTN Mobile Money, Orange Money, YUP,
// Express Union) — their payment rails are denominated in real local currencies, not
// USD, and their own API docs (developer.payunit.net) show currency:"XAF" +
// payment_country:"CM" in every example. Sending currency:"USD" with no
// payment_country (what this used to do) leaves PayUnit with no channel to match,
// which is exactly why their hosted checkout showed "No options" for payment method.
// branches.country already stores a real ISO 3166-1 alpha-2 code (matches this
// mapping's keys and PayUnit's own payment_country format directly, no conversion
// needed there). This covers the CFA franc zone plus a few other markets PayUnit is
// documented to serve; anything outside it falls back to Cameroon/XAF — PayUnit's own
// home market and the currency used in their own docs' example — rather than USD,
// which we now know produces no payment options at all.
const PAYUNIT_COUNTRY_CURRENCY: Record<string, string> = {
  CM: "XAF", TD: "XAF", CF: "XAF", CG: "XAF", GQ: "XAF", GA: "XAF",
  SN: "XOF", CI: "XOF", ML: "XOF", BF: "XOF", NE: "XOF", GW: "XOF", TG: "XOF", BJ: "XOF",
  NG: "NGN", GH: "GHS", KE: "KES",
};
const PAYUNIT_DEFAULT_COUNTRY = "CM";

function resolvePayunitLocale(orgCountry: string | null): { currency: string; paymentCountry: string } {
  const code = (orgCountry ?? "").toUpperCase();
  const currency = PAYUNIT_COUNTRY_CURRENCY[code];
  if (currency) return { currency, paymentCountry: code };
  return { currency: PAYUNIT_COUNTRY_CURRENCY[PAYUNIT_DEFAULT_COUNTRY], paymentCountry: PAYUNIT_DEFAULT_COUNTRY };
}

// Real, fixed conversion from Nutro's canonical USD plan prices into the target local
// currency. Not a live FX feed (no network access to one here) — same-order-of-
// magnitude approximate rates so the amount PayUnit actually charges is a real local
// price rather than a raw USD number relabeled with a local currency code (which
// would be wildly wrong — 1890 XAF is not the same value as 1890 USD).
const USD_TO_LOCAL_RATE: Record<string, number> = {
  XAF: 610, XOF: 610, NGN: 1550, GHS: 15, KES: 129,
};

function convertUsdToLocal(usdAmount: number, currency: string): number {
  const rate = USD_TO_LOCAL_RATE[currency] ?? 1;
  return Math.round(usdAmount * rate);
}

async function getOrgContext(supabase: ReturnType<typeof createClient>): Promise<OrgContext | null> {
  const { data, error } = await supabase.rpc("get_user_org_context");
  if (error) throw error;
  return (data as OrgContext | null) ?? null;
}

function payunitCredentials() {
  // Accept either naming convention for these secrets — different people setting up
  // PayUnit reasonably call the same thing different names (API_USER vs
  // API_USERNAME, APP_TOKEN vs API_KEY), and a name mismatch here silently makes
  // the whole integration act "not configured" with no indication why.
  const apiUser = Deno.env.get("PAYUNIT_API_USER") ?? Deno.env.get("PAYUNIT_API_USERNAME");
  const apiPassword = Deno.env.get("PAYUNIT_API_PASSWORD");
  const appToken = Deno.env.get("PAYUNIT_APP_TOKEN") ?? Deno.env.get("PAYUNIT_API_KEY");
  const mode = Deno.env.get("PAYUNIT_MODE") ?? "test";
  if (!apiUser || !apiPassword || !appToken) return null;
  return {
    apiUser, apiPassword, appToken, mode,
    authHeader: `Basic ${btoa(`${apiUser}:${apiPassword}`)}`,
  };
}

async function updateSubscriptionStatus(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  txRef: string,
  patch: Record<string, unknown>
) {
  return await supabase.from("subscriptions").update(patch).eq("org_id", orgId).eq("flw_tx_ref", txRef).eq("psp", "payunit");
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
      return new Response(JSON.stringify({ configured: Boolean(payunitCredentials()) }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PayUnit's notify_url webhook lands here with no `action` field and no Supabase
    // session (same reasoning as the Flutterwave webhook fix earlier this session).
    // We deliberately do NOT activate anything from this payload — the "verify" action
    // below independently re-checks the real status against PayUnit's API before ever
    // touching plan_status, so trusting this notification isn't necessary for
    // correctness. Just acknowledge it so PayUnit doesn't retry indefinitely.
    if (!action && body && typeof body === "object") {
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

    const creds = payunitCredentials();
    if (!creds) {
      return new Response(JSON.stringify({ error: "PayUnit is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgData = await getOrgContext(supabaseAsUser);
    if (!orgData?.org_id) {
      return new Response(JSON.stringify({ error: "Could not find organization context for this user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const orgId = orgData.org_id;

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
        return new Response(JSON.stringify({ error: "Unknown plan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const period = billing_period === "annual" ? "annual" : "monthly";
      const usdAmount = prices[period];
      const { currency, paymentCountry } = resolvePayunitLocale(orgData.country);
      const amount = convertUsdToLocal(usdAmount, currency);
      const txRef = `PU-${orgId.slice(0, 8)}-${Date.now()}`;
      const appOrigin = req.headers.get("origin") || Deno.env.get("APP_BASE_URL") || "https://nutro.app";

      const payunitResponse = await fetch(`${PAYUNIT_BASE_URL}/api/gateway/checkout/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": creds.authHeader,
          "x-api-key": creds.appToken,
          "mode": creds.mode,
        },
        body: JSON.stringify({
          cancel_url: `${appOrigin}/app/admin/settings?billing=cancelled`,
          success_url: `${appOrigin}/app/admin/settings?billing=success`,
          notify_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payunit-pay`,
          currency,
          payment_country: paymentCountry,
          mode: "payment",
          transaction_id: txRef,
          total_amount: amount,
          items: [{
            price_description: { unit_amount: amount },
            product_description: {
              name: `Nutro ${normalizedPlan} plan (${period})`,
              image_url: "https://nutro.app/logo.png",
              about_product: `Nutro subscription — ${normalizedPlan} plan, billed ${period}`,
            },
            quantity: 1,
          }],
          meta: { phone_number_collection: false, address_collection: false, org_id: orgId },
        }),
      });
      const payunitData = await payunitResponse.json();
      if (payunitData.status !== "SUCCESS" || !payunitData.data?.redirect) {
        return new Response(JSON.stringify({ error: payunitData.message || "Could not initialize PayUnit checkout" }), {
          status: 502,
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
        psp: "payunit",
      } as never);
      if (insertResult.error) throw insertResult.error;

      return new Response(JSON.stringify({ payment_link: payunitData.data.redirect, tx_ref: txRef, amount, currency, demo_mode: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!tx_ref) {
        return new Response(JSON.stringify({ error: "Missing tx_ref" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusResponse = await fetch(`${PAYUNIT_BASE_URL}/api/gateway/checkout/status/${tx_ref}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": creds.authHeader,
          "x-api-key": creds.appToken,
          "mode": creds.mode,
        },
      });
      const statusData = await statusResponse.json();
      const remoteStatus = statusData?.data?.status;
      const isSuccessful = remoteStatus === "SUCCESS";

      if (isSuccessful) {
        const { data: subscriptionRow, error: subLookupError } = await supabase
          .from("subscriptions")
          .select("plan")
          .eq("org_id", orgId)
          .eq("flw_tx_ref", tx_ref)
          .eq("psp", "payunit")
          .maybeSingle();
        if (subLookupError) throw subLookupError;
        if (!subscriptionRow) {
          return new Response(JSON.stringify({ error: "No matching subscription found for this org" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const updateResult = await updateSubscriptionStatus(supabase, orgId, tx_ref, {
          status: "successful",
          flw_tx_id: String(statusData?.data?.transaction?.id ?? ""),
          paid_at: new Date().toISOString(),
        });
        if (updateResult.error) throw updateResult.error;

        const orgUpdate = await supabase.from("organizations").update({
          plan: subscriptionRow.plan as string,
          plan_status: "active",
        }).eq("id", orgId);
        if (orgUpdate.error) throw orgUpdate.error;

        return new Response(JSON.stringify({ status: "successful" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (remoteStatus === "FAILED" || remoteStatus === "CANCELLED") {
        await updateSubscriptionStatus(supabase, orgId, tx_ref, { status: "failed" });
      }

      return new Response(JSON.stringify({ status: "pending", message: "Payment not completed yet" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
