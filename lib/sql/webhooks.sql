-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  event text NOT NULL, -- e.g. 'user.created', 'payment.success'
  target_url text NOT NULL,
  secret text, -- optional signing secret
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_event ON public.webhooks(tenant_id, event);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS webhooks_select_policy ON public.webhooks;
DROP POLICY IF EXISTS webhooks_insert_policy ON public.webhooks;
DROP POLICY IF EXISTS webhooks_update_policy ON public.webhooks;
DROP POLICY IF EXISTS webhooks_delete_policy ON public.webhooks;

CREATE POLICY webhooks_select_policy
  ON public.webhooks
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  );

CREATE POLICY webhooks_insert_policy
  ON public.webhooks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY webhooks_update_policy
  ON public.webhooks
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY webhooks_delete_policy
  ON public.webhooks
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );