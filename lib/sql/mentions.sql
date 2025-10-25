-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('comment', 'task', 'project')),
  source_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_seen boolean DEFAULT false
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_mentions_user_tenant ON public.mentions(mentioned_user_id, tenant_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (sadece bahsedilen kişi veya admin görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mentions' AND policyname = 'mentions_select_user_or_admin'
  ) THEN
    CREATE POLICY mentions_select_user_or_admin
      ON public.mentions
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          mentioned_user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- INSERT (mention oluşturulurken)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mentions' AND policyname = 'mentions_insert_creator_and_tenant'
  ) THEN
    CREATE POLICY mentions_insert_creator_and_tenant
      ON public.mentions
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          created_by = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- UPDATE (örn. is_seen = true yapmak için)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mentions' AND policyname = 'mentions_update_user_or_admin'
  ) THEN
    CREATE POLICY mentions_update_user_or_admin
      ON public.mentions
      FOR UPDATE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          mentioned_user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      )
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          mentioned_user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;
END;
$$;
