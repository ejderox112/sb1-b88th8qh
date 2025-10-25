-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  invoice_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  status text DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  payment_method text, -- e.g. 'credit_card', 'paypal', 'bank_transfer'
  metadata jsonb, -- e.g. { "card_last4": "1234", "provider": "stripe" }
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_billing_history_tenant_status ON public.billing_history(tenant_id, status);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS billing_history_select_policy ON public.billing_history;
DROP POLICY IF EXISTS billing_history_insert_policy ON public.billing_history;

CREATE POLICY billing_history_select_policy
  ON public.billing_history
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
      OR user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY billing_history_insert_policy
  ON public.billing_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
      OR user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );