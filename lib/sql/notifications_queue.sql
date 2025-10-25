-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.notifications_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('reminder', 'mention', 'comment', 'system', 'custom')),
  payload jsonb, -- örn: { "task_id": "...", "message": "..." }
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.notifications_queue ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_notifications_queue_user_status ON public.notifications_queue(user_id, tenant_id, status, scheduled_at);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (sadece ilgili kullanıcı veya admin görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications_queue' AND policyname = 'notifications_select_user_or_admin'
  ) THEN
    CREATE POLICY notifications_select_user_or_admin
      ON public.notifications_queue
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- INSERT (sistem veya kullanıcı tarafından tetiklenebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications_queue' AND policyname = 'notifications_insert_user_and_tenant'
  ) THEN
    CREATE POLICY notifications_insert_user_and_tenant
      ON public.notifications_queue
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- UPDATE (örn. sent_at ve status güncellemesi için sadece admin veya sistem)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications_queue' AND policyname = 'notifications_update_admin_only'
  ) THEN
    CREATE POLICY notifications_update_admin_only
      ON public.notifications_queue
      FOR UPDATE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
      )
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
      );
  END IF;
END;
$$;
