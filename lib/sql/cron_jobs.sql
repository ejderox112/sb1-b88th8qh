-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.cron_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  schedule text NOT NULL, -- e.g. '0 0 * * *' (cron format)
  handler text NOT NULL, -- e.g. 'generate_report', 'cleanup_logs'
  last_run_at timestamptz,
  next_run_at timestamptz,
  status text DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'failed', 'completed')),
  error text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.cron_jobs ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_cron_jobs_tenant_status ON public.cron_jobs(tenant_id, status);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS cron_jobs_select_policy ON public.cron_jobs;
DROP POLICY IF EXISTS cron_jobs_insert_policy ON public.cron_jobs;
DROP POLICY IF EXISTS cron_jobs_update_policy ON public.cron_jobs;
DROP POLICY IF EXISTS cron_jobs_delete_policy ON public.cron_jobs;

CREATE POLICY cron_jobs_select_policy
  ON public.cron_jobs
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY cron_jobs_insert_policy
  ON public.cron_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY cron_jobs_update_policy
  ON public.cron_jobs
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY cron_jobs_delete_policy
  ON public.cron_jobs
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );