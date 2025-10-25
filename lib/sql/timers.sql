-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  duration_seconds integer GENERATED ALWAYS AS (
    CASE
      WHEN stopped_at IS NOT NULL THEN EXTRACT(EPOCH FROM stopped_at - started_at)::int
      ELSE NULL
    END
  ) STORED,
  owner_user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.timers ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_timers_tenant_owner ON public.timers(tenant_id, owner_user_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'timers' AND policyname = 'timers_select_owner_or_admin'
  ) THEN
    CREATE POLICY timers_select_owner_or_admin
      ON public.timers
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'timers' AND policyname = 'timers_insert_owner_and_tenant'
  ) THEN
    CREATE POLICY timers_insert_owner_and_tenant
      ON public.timers
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;

  -- UPDATE (örn. stopped_at güncellemesi)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'timers' AND policyname = 'timers_update_owner_and_tenant'
  ) THEN
    CREATE POLICY timers_update_owner_and_tenant
      ON public.timers
      FOR UPDATE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      )
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND owner_user_id = auth.uid()
        )
      );
  END IF;
END;
$$;
