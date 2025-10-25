-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  triggered_by uuid,
  event_type text NOT NULL CHECK (event_type IN ('subscription.created', 'subscription.renewed', 'subscription.cancelled', 'payment.success', 'payment.failed')),
  provider text CHECK (provider IN ('stripe', 'paddle', 'iyzico', 'manual')),
  external_reference text, -- örn: Stripe event ID
  amount numeric(10,2),
  currency text DEFAULT 'USD',
  status text CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_event ON public.billing_events(tenant_id, event_type, occurred_at);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (sadece admin görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'billing_events' AND policyname = 'billing_events_select_admin_only'
  ) THEN
    CREATE POLICY billing_events_select_admin_only
      ON public.billing_events
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
      );
  END IF;

  -- INSERT (sadece sistem veya admin tetikleyebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'billing_events' AND policyname = 'billing_events_insert_admin_only'
  ) THEN
    CREATE POLICY billing_events_insert_admin_only
      ON public.billing_events
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
      );
  END IF;
END;
$$;
