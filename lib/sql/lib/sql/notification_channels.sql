-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.notification_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  channel_type text NOT NULL CHECK (channel_type IN (
    'email', 'sms', 'slack', 'webhook', 'push'
  )),
  config jsonb NOT NULL, -- e.g. { "api_key": "...", "sender": "...", "webhook_url": "...", "template_id": "..." }
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_notification_channels_tenant_type ON public.notification_channels(tenant_id, channel_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS notification_channels_select_policy ON public.notification_channels;
DROP POLICY IF EXISTS notification_channels_insert_policy ON public.notification_channels;
DROP POLICY IF EXISTS notification_channels_update_policy ON public.notification_channels;
DROP POLICY IF EXISTS notification_channels_delete_policy ON public.notification_channels;

CREATE POLICY notification_channels_select_policy
  ON public.notification_channels
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY notification_channels_insert_policy
  ON public.notification_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY notification_channels_update_policy
  ON public.notification_channels
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

CREATE POLICY notification_channels_delete_policy
  ON public.notification_channels
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
