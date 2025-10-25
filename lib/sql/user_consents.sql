-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  consent_type text NOT NULL, -- e.g. 'terms_of_service', 'privacy_policy', 'marketing_emails'
  consent_version text NOT NULL, -- e.g. 'v1.2', '2025-10-01'
  accepted boolean DEFAULT true,
  accepted_at timestamptz DEFAULT now(),
  revoked boolean DEFAULT false,
  revoked_at timestamptz,
  metadata jsonb, -- e.g. { "ip": "1.2.3.4", "device": "mobile" }
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_user_consents_tenant_type ON public.user_consents(tenant_id, consent_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS user_consents_select_policy ON public.user_consents;
DROP POLICY IF EXISTS user_consents_insert_policy ON public.user_consents;
DROP POLICY IF EXISTS user_consents_update_policy ON public.user_consents;
DROP POLICY IF EXISTS user_consents_delete_policy ON public.user_consents;

CREATE POLICY user_consents_select_policy
  ON public.user_consents
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY user_consents_insert_policy
  ON public.user_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY user_consents_update_policy
  ON public.user_consents
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  )
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );

CREATE POLICY user_consents_delete_policy
  ON public.user_consents
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );