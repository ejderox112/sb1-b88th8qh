CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  template_key text NOT NULL,
  channel text CHECK (channel IN ('email', 'sms', 'push')) NOT NULL,
  subject text,
  body markdown NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant_channel ON public.notification_templates(tenant_id, channel);

DROP POLICY IF EXISTS notification_templates_select_policy ON public.notification_templates;
DROP POLICY IF EXISTS notification_templates_insert_policy ON public.notification_templates;

CREATE POLICY notification_templates_select_policy
  ON public.notification_templates
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY notification_templates_insert_policy
  ON public.notification_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
