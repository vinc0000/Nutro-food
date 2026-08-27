/*
# Schema for the new super-admin modules

Real tables backing the new super-admin pages, so each one has genuine data to
manage instead of being a static/fabricated shell:

- audit_log: a real record of sensitive super-admin actions (promote/revoke admin,
  suspend/activate a tenant, plan changes), written via log_audit_event() so the
  Audit module shows what actually happened instead of a fake activity feed.
- api_keys: platform API keys an Enterprise tenant can use to call Nutro's API.
  Only the hash + a short prefix are stored — the full key is shown once at
  creation and never again, the same pattern as GitHub/Stripe tokens.
- support_tickets: minimal real ticketing (a tenant can open a ticket, a super
  admin can triage/resolve it) so the Support module has actual data.
- platform_settings: simple key/value store for platform-wide settings, so new
  settings don't need a schema migration every time one is added.
*/

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  target_label text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text, p_target_type text DEFAULT NULL, p_target_id uuid DEFAULT NULL,
  p_target_label text DEFAULT NULL, p_details jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_email text;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_log (actor_id, actor_email, action, target_type, target_id, target_label, details)
  VALUES (auth.uid(), v_email, p_action, p_target_type, p_target_id, p_target_label, p_details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.log_audit_event(text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, uuid, text, jsonb) TO authenticated;

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_select" ON public.api_keys FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_org_member(auth.uid(), org_id));
CREATE POLICY "api_keys_super_admin_write" ON public.api_keys FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_tickets_select" ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_org_member(auth.uid(), org_id));
CREATE POLICY "support_tickets_insert" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_org_member(auth.uid(), org_id));
CREATE POLICY "support_tickets_update" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_org_member(auth.uid(), org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_org_member(auth.uid(), org_id));

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_settings_select" ON public.platform_settings FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "platform_settings_write" ON public.platform_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.platform_settings (key, value) VALUES
  ('trial_length_days', '14'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('default_plan', '"trial"'::jsonb)
ON CONFLICT (key) DO NOTHING;
