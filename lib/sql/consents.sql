-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  consent_type text NOT NULL, -- e.g. 'email_marketing', 'terms_of_service', 'privacy_policy'
  consent_given boolean NOT NULL,
  given_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_consents_user_tenant_type ON public.consents(user_id, tenant_id, consent_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS consents_select_policy ON public.consents;
DROP POLICY IF EXISTS consents_insert_policy ON public.consents;
DROP POLICY IF EXISTS consents_update_policy ON public.consents;
DROP POLICY IF EXISTS consents_delete_policy ON public.consents;

CREATE POLICY consents_select_policy
  ON public.consents
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY consents_insert_policy
  ON public.consents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY consents_update_policy
  ON public.consents
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY consents_delete_policy
  ON public.consents
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );