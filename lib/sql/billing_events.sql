-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('subscription.created', 'subscription.cancelled', 'payment.success', 'payment.failed', 'refund.issued')),
  reference_id text, -- e.g. Stripe ID, invoice ID
  amount bigint NOT NULL,
  currency text DEFAULT 'USD',
  metadata jsonb, -- e.g. { "method": "card", "provider": "stripe" }
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_event ON public.billing_events(tenant_id, event_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS billing_events_select_policy ON public.billing_events;
DROP POLICY IF EXISTS billing_events_insert_policy ON public.billing_events;

CREATE POLICY billing_events_select_policy
  ON public.billing_events
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND (
        user_id IS NULL
        OR user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      )
    )
  );

CREATE POLICY billing_events_insert_policy
  ON public.billing_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND (
        user_id IS NULL
        OR user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      )
    )
  );