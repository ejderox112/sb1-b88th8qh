-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  tenant_id uuid,
  action text NOT NULL, -- örn: 'delete_task', 'update_project'
  entity_type text NOT NULL, -- örn: 'task', 'project'
  entity_id uuid NOT NULL,
  metadata jsonb, -- opsiyonel detaylar
  created_at timestamp DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_actor ON public.activity_logs(tenant_id, actor_user_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'activity_logs_select_actor_or_admin'
  ) THEN
    CREATE POLICY activity_logs_select_actor_or_admin
      ON public.activity_logs
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND actor_user_id = auth.uid()
        )
      );
  END IF;

  -- INSERT (genellikle trigger ile yapılır ama client da ekleyebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'activity_logs_insert_actor_and_tenant'
  ) THEN
    CREATE POLICY activity_logs_insert_actor_and_tenant
      ON public.activity_logs
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND actor_user_id = auth.uid()
        )
      );
  END IF;
END;
$$;
