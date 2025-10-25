-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('terms', 'privacy', 'marketing', 'cookies', 'data_sharing')),
  consent_version text,
  consented boolean NOT NULL,
  consented_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  context jsonb, -- e.g. { "screen": "signup", "language": "tr" }
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_consent_logs_tenant_type ON public.consent_logs(tenant_id, consent_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS consent_logs_select_policy ON public.consent_logs;
DROP POLICY IF EXISTS consent_logs_insert_policy ON public.consent_logs;

CREATE POLICY consent_logs_select_policy
  ON public.consent_logs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      OR (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'compliance')
    )
  );

CREATE POLICY consent_logs_insert_policy
  ON public.consent_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );