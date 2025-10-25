CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  template_id uuid,
  channel text CHECK (channel IN ('email', 'sms', 'push')) NOT NULL,
  status text CHECK (status IN ('sent', 'failed', 'queued')) DEFAULT 'queued',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notification_logs_tenant_user ON public.notification_logs(tenant_id, user_id);

DROP POLICY IF EXISTS notification_logs_select_policy ON public.notification_logs;
DROP POLICY IF EXISTS notification_logs_insert_policy ON public.notification_logs;

CREATE POLICY notification_logs_select_policy
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      OR (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'support')
    )
  );

CREATE POLICY notification_logs_insert_policy
  ON public.notification_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
  );
