-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid,
  event_type text NOT NULL, -- e.g. 'user.signup', 'payment.failed', 'backup.completed'
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'slack', 'webhook')),
  target text NOT NULL, -- e.g. email address, phone number, webhook URL
  is_active boolean DEFAULT true,
  filters jsonb, -- e.g. { "severity": ["critical"], "region": ["EU"] }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_notification_rules_tenant_event ON public.notification_rules(tenant_id, event_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS notification_rules_select_policy ON public.notification_rules;
DROP POLICY IF EXISTS notification_rules_insert_policy ON public.notification_rules;
DROP POLICY IF EXISTS notification_rules_update_policy ON public.notification_rules;
DROP POLICY IF EXISTS notification_rules_delete_policy ON public.notification_rules;

CREATE POLICY notification_rules_select_policy
  ON public.notification_rules
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY notification_rules_insert_policy
  ON public.notification_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY notification_rules_update_policy
  ON public.notification_rules
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

CREATE POLICY notification_rules_delete_policy
  ON public.notification_rules
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );