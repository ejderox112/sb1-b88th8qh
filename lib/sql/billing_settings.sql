-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.billing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  plan_name text NOT NULL,
  billing_email text,
  payment_provider text CHECK (payment_provider IN ('stripe', 'paypal', 'iyzico', 'manual')),
  payment_method jsonb, -- e.g. { "card_last4": "1234", "type": "visa" }
  billing_address jsonb, -- e.g. { "country": "TR", "city": "İzmir", "tax_id": "1234567890" }
  currency text DEFAULT 'USD',
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_billing_settings_tenant_plan ON public.billing_settings(tenant_id, plan_name);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS billing_settings_select_policy ON public.billing_settings;
DROP POLICY IF EXISTS billing_settings_insert_policy ON public.billing_settings;
DROP POLICY IF EXISTS billing_settings_update_policy ON public.billing_settings;
DROP POLICY IF EXISTS billing_settings_delete_policy ON public.billing_settings;

CREATE POLICY billing_settings_select_policy
  ON public.billing_settings
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'finance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY billing_settings_insert_policy
  ON public.billing_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'finance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY billing_settings_update_policy
  ON public.billing_settings
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'finance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'finance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY billing_settings_delete_policy
  ON public.billing_settings
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'finance')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );
