-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  job_name text NOT NULL,
  schedule text NOT NULL, -- e.g. '0 0 * * *' (cron format)
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  last_run_at timestamptz,
  next_run_at timestamptz,
  run_count int DEFAULT 0,
  handler text NOT NULL, -- e.g. 'sync_users', 'generate_report'
  payload jsonb, -- e.g. { "report_type": "weekly", "format": "csv" }
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_tenant_status ON public.scheduled_jobs(tenant_id, status);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS scheduled_jobs_select_policy ON public.scheduled_jobs;
DROP POLICY IF EXISTS scheduled_jobs_insert_policy ON public.scheduled_jobs;
DROP POLICY IF EXISTS scheduled_jobs_update_policy ON public.scheduled_jobs;
DROP POLICY IF EXISTS scheduled_jobs_delete_policy ON public.scheduled_jobs;

CREATE POLICY scheduled_jobs_select_policy
  ON public.scheduled_jobs
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY scheduled_jobs_insert_policy
  ON public.scheduled_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY scheduled_jobs_update_policy
  ON public.scheduled_jobs
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

CREATE POLICY scheduled_jobs_delete_policy
  ON public.scheduled_jobs
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'developer')
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );