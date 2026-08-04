import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 29, annual: 290 },
  premium: { monthly: 69, annual: 690 },
  enterprise: { monthly: 189, annual: 1890 },
};

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

    const body = await req.json();
    const { action, plan, billing_period, tx_ref, transaction_id } = body;

    // Get user's org
    const { data: orgData, error: orgError } = await supabase.rpc("get_user_org_context", {
      _user_id: userData.user.id,
    });

    if (orgError || !orgData) {
      return new Response(JSON.stringify({ error: "Could not find organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = orgData.org;
    const orgName = orgData.org_name;
    const billingEmail = orgData.billing_email || userData.user.email;

    if (action === "initialize") {
      // Initialize a Flutterwave payment
      const prices = PLAN_PRICES[plan];
      if (!prices) {
        return new Response(JSON.stringify({ error: "Invalid plan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const period = billing_period === "annual" ? "annual" : "monthly";
      const amount = prices[period];
      const currency = orgData.currency || "USD";
      const txRef = `nutro-${plan}-${Date.now()}`;

      // Save pending subscription
      const { error: subError } = await supabase.from("subscriptions").insert({
        org_id: orgId,
        plan,
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

      // Call Flutterwave API to initialize payment
      const flwSecretKey = Deno.env.get("FLW_SECRET_KEY");
      if (!flwSecretKey) {
        return new Response(JSON.stringify({
          error: "Flutterwave not configured. Please add FLW_SECRET_KEY secret.",
          tx_ref: txRef,
          amount,
          currency,
          payment_link: null,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const flwResponse = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${flwSecretKey}`,
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
            description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan - ${period}`,
            logo: "https://nutro.app/logo.png",
          },
          meta: {
            org_id: orgId,
            plan,
            billing_period: period,
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
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({
          error: "Failed to initialize payment",
          details: flwData.message,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "verify") {
      // Verify a Flutterwave payment
      const flwSecretKey = Deno.env.get("FLW_SECRET_KEY");
      if (!flwSecretKey) {
        return new Response(JSON.stringify({ error: "Flutterwave not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const verifyResponse = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
        {
          headers: { "Authorization": `Bearer ${flwSecretKey}` },
        }
      );

      const verifyData = await verifyResponse.json();

      if (verifyData.status === "success" && verifyData.data.status === "successful") {
        // Update subscription record
        await supabase.from("subscriptions")
          .update({
            status: "successful",
            flw_tx_id: transaction_id.toString(),
            paid_at: new Date().toISOString(),
          })
          .eq("flw_tx_ref", tx_ref);

        // Update org plan to active
        await supabase.from("organizations")
          .update({
            plan,
            plan_status: "active",
          })
          .eq("id", orgId);

        return new Response(JSON.stringify({
          status: "successful",
          plan,
          message: "Payment verified and plan activated",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        await supabase.from("subscriptions")
          .update({ status: "failed" })
          .eq("flw_tx_ref", tx_ref);

        return new Response(JSON.stringify({
          status: "failed",
          message: verifyData.data?.processor_response || "Payment verification failed",
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
