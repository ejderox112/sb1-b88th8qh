-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  api_key_id uuid,
  endpoint text NOT NULL,
  method text NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  status_code int,
  duration_ms int,
  request_size_bytes int,
  response_size_bytes int,
  error text,
  metadata jsonb, -- e.g. { "ip": "1.2.3.4", "region": "EU" }
  called_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_tenant_endpoint ON public.api_usage_logs(tenant_id, endpoint);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS api_usage_logs_select_policy ON public.api_usage_logs;
DROP POLICY IF EXISTS api_usage_logs_insert_policy ON public.api_usage_logs;

CREATE POLICY api_usage_logs_select_policy
  ON public.api_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY api_usage_logs_insert_policy
  ON public.api_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );