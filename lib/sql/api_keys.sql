-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL,
  name text NOT NULL,
  key text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_active ON public.api_keys(tenant_id, is_active);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT (sadece kendi tenant’ındaki anahtarları görebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_select_creator_or_admin'
  ) THEN
    CREATE POLICY api_keys_select_creator_or_admin
      ON public.api_keys
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          created_by = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- INSERT (sadece kendi tenant’ı için anahtar oluşturabilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_insert_creator_and_tenant'
  ) THEN
    CREATE POLICY api_keys_insert_creator_and_tenant
      ON public.api_keys
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          created_by = auth.uid()
          AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
      );
  END IF;

  -- DELETE (sadece kendi oluşturduğu anahtarı silebilir)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_delete_creator_and_tenant'
  ) THEN
    CREATE POLICY api_keys_delete_creator_and_tenant
      ON public.api_keys
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
