-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('comment', 'task', 'project')),
  target_id uuid NOT NULL,
  emoji text NOT NULL, -- örn: '👍', '❤️', '🔥'
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_reactions_user_target ON public.reactions(user_id, tenant_id, target_type, target_id);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (herkes görebilir ama sadece kendi tenant'ı içinden)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reactions' AND policyname = 'reactions_select_tenant_or_admin'
  ) THEN
    CREATE POLICY reactions_select_tenant_or_admin
      ON public.reactions
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
      );
  END IF;

  -- INSERT (kendi adına emoji ekleyebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reactions' AND policyname = 'reactions_insert_user_and_tenant'
  ) THEN
    CREATE POLICY reactions_insert_user_and_tenant
      ON public.reactions
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- DELETE (kendi eklediği emojiyi kaldırabilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reactions' AND policyname = 'reactions_delete_user_and_tenant'
  ) THEN
    CREATE POLICY reactions_delete_user_and_tenant
      ON public.reactions
      FOR DELETE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          user_id = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;
END;
$$;
