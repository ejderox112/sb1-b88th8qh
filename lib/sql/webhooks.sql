-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid,
  event_type text NOT NULL, -- e.g. 'user.created', 'invoice.paid', 'backup.failed'
  target_url text NOT NULL,
  secret text,
  is_active boolean DEFAULT true,
  headers jsonb, -- e.g. { "Authorization": "Bearer xyz" }
  retry_policy jsonb, -- e.g. { "max_attempts": 3, "backoff": "exponential" }
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_event ON public.webhooks(tenant_id, event_type);

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
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY webhooks_insert_policy
  ON public.webhooks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY webhooks_update_policy
  ON public.webhooks
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY webhooks_delete_policy
  ON public.webhooks
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );