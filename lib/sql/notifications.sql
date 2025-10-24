-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_notifications_user_tenant ON public.notifications(user_id, tenant_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'notifications_select_user_or_admin'
  ) THEN
    CREATE POLICY notifications_select_user_or_admin
      ON public.notifications
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id IS NOT NULL
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND user_id = auth.uid()
        )
      );
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'notifications_insert_user_and_tenant'
  ) THEN
    CREATE POLICY notifications_insert_user_and_tenant
      ON public.notifications
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id IS NOT NULL
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND user_id = auth.uid()
        )
      );
  END IF;

  -- UPDATE (örn. read=true yapmak için)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'notifications_update_user_and_tenant'
  ) THEN
    CREATE POLICY notifications_update_user_and_tenant
      ON public.notifications
      FOR UPDATE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id IS NOT NULL
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND user_id = auth.uid()
        )
      )
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id IS NOT NULL
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND user_id = auth.uid()
        )
      );
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'notifications_delete_user_and_tenant'
  ) THEN
    CREATE POLICY notifications_delete_user_and_tenant
      ON public.notifications
      FOR DELETE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id IS NOT NULL
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND user_id = auth.uid()
        )
      );
  END IF;
END;
$$;
