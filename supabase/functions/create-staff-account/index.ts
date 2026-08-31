import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Staff members created this way never sign in with an email/password of their own —
// they authenticate at the POS with their staff_code + PIN. Supabase still requires
// every auth.users row to have a unique email, so we mint an internal, never-emailed
// one from the org id + a random suffix. The password is a long random string nobody
// is ever given; it exists only because Supabase's schema requires *a* password.
function generateInternalEmail(orgId: string): string {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `staff-${orgId.slice(0, 8)}-${suffix}@staff.internal.nutro.app`;
}

function generateInternalPassword(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Same reasoning as the PSP functions: get_user_org_context()/add_staff_member()
    // both resolve the caller via auth.uid(), which only works when the request is
    // made with the caller's OWN JWT — not the service-role key used above for the
    // privileged admin.createUser() call below.
    const supabaseAsUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: orgContext, error: orgError } = await supabaseAsUser.rpc("get_user_org_context");
    if (orgError) throw orgError;
    const orgId = (orgContext as { org_id?: string } | null)?.org_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Could not find organization context for this user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { full_name, role_name, permissions, pos_pin } = body as {
      full_name?: string;
      role_name?: string;
      permissions?: Record<string, string[]>;
      pos_pin?: string;
    };

    const trimmedName = full_name?.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return new Response(JSON.stringify({ error: "Enter the staff member's name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!role_name) {
      return new Response(JSON.stringify({ error: "Missing role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (pos_pin && (pos_pin.length < 4 || pos_pin.length > 8)) {
      return new Response(JSON.stringify({ error: "POS PIN must be 4 to 8 digits" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deliberately no org_name in user_metadata — handle_new_user() only creates the
    // profiles row when org_name is absent, and skips creating a second organization/
    // branch for this brand-new auth user, which is exactly what a staff account needs.
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: generateInternalEmail(orgId),
      password: generateInternalPassword(),
      email_confirm: true,
      user_metadata: { full_name: trimmedName },
    });
    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "Could not create staff account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // add_staff_member runs its own authorization check (caller_can_manage_org_staff,
    // via auth.uid()) — calling it on supabaseAsUser is what lets that check see the
    // manager who's actually making this request, not the service role.
    const { data: result, error: addError } = await supabaseAsUser.rpc("add_staff_member", {
      p_org_id: orgId,
      p_user_id: created.user.id,
      p_role_name: role_name,
      p_permissions: permissions ?? {},
      p_pos_pin: pos_pin || null,
    });

    if (addError || !result) {
      // Roll back the auth user so a failed staff-add doesn't leave an orphaned,
      // org-less account behind.
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: addError?.message ?? "Could not add staff member — check permissions" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const staffCode = (result as { staff_code?: string }).staff_code ?? null;

    return new Response(JSON.stringify({
      user_id: created.user.id,
      staff_code: staffCode,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
