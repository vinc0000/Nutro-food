/*
# Integrations module

Lets an org connect external business apps (CRM, accounting, notifications,
automation) by storing an API key/config per provider. Read/write is restricted to
managers/owners of that org (or a platform super admin) — the same permission level
already used for staff PIN resets and refunds.

NOTE: this stores credentials as plaintext protected by RLS, the same protection
level already used elsewhere in this schema (e.g. organizations.billing_email) —
it is not column-level encrypted. If a given provider's own API requires more, that
should be added when its real integration logic is built.
*/

CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('atlas_crm', 'libooks', 'whatsapp', 'webhook')),
  api_key text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  connected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, provider)
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integrations_select" ON public.integrations;
CREATE POLICY "integrations_select" ON public.integrations
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid() AND org_id = integrations.org_id
        AND role_name IN ('owner', 'org_owner', 'branch_manager')
    )
  );

DROP POLICY IF EXISTS "integrations_write" ON public.integrations;
CREATE POLICY "integrations_write" ON public.integrations
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid() AND org_id = integrations.org_id
        AND role_name IN ('owner', 'org_owner', 'branch_manager')
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_org_roles
      WHERE user_id = auth.uid() AND org_id = integrations.org_id
        AND role_name IN ('owner', 'org_owner', 'branch_manager')
    )
  );
