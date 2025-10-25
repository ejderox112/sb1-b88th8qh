-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  metric_key text NOT NULL, -- e.g. 'session.start', 'click.dashboard', 'api.request'
  value numeric DEFAULT 1,
  metadata jsonb, -- e.g. { "device": "mobile", "region": "EU" }
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_usage_metrics_tenant_key ON public.usage_metrics(tenant_id, metric_key);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS usage_metrics_select_policy ON public.usage_metrics;
DROP POLICY IF EXISTS usage_metrics_insert_policy ON public.usage_metrics;

CREATE POLICY usage_metrics_select_policy
  ON public.usage_metrics
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY usage_metrics_insert_policy
  ON public.usage_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );