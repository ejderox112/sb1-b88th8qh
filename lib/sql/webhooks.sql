-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL,
  event text NOT NULL, -- örn: 'task.completed', 'project.created'
  target_url text NOT NULL,
  is_active boolean DEFAULT true,
  secret text, -- opsiyonel: imza doğrulama için
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_event ON public.webhooks(tenant_id, event);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (sadece kendi tenant’ındaki kayıtları görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'webhooks' AND policyname = 'webhooks_select_creator_or_admin'
  ) THEN
    CREATE POLICY webhooks_select_creator_or_admin
      ON public.webhooks
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          created_by = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- INSERT (sadece kendi adına webhook tanımlayabilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'webhooks' AND policyname = 'webhooks_insert_creator_and_tenant'
  ) THEN
    CREATE POLICY webhooks_insert_creator_and_tenant
      ON public.webhooks
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          created_by = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- DELETE (sadece kendi tanımladığı webhook’u kaldırabilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'webhooks' AND policyname = 'webhooks_delete_creator_and_tenant'
  ) THEN
    CREATE POLICY webhooks_delete_creator_and_tenant
      ON public.webhooks
      FOR DELETE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          created_by = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;
END;
$$;

