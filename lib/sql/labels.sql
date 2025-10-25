-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text, -- örn: '#00FF00'
  tenant_id uuid NOT NULL,
  created_by uuid NOT NULL,
  system_defined boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_labels_tenant_creator ON public.labels(tenant_id, created_by);

-- 4) RLS Politikaları
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'labels' AND policyname = 'labels_select_creator_or_admin'
  ) THEN
    CREATE POLICY labels_select_creator_or_admin
      ON public.labels
      FOR SELECT
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND created_by = auth.uid()
        )
      );
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'labels' AND policyname = 'labels_insert_creator_and_tenant'
  ) THEN
    CREATE POLICY labels_insert_creator_and_tenant
      ON public.labels
      FOR INSERT
      WITH CHECK (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND created_by = auth.uid()
        )
      );
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'labels' AND policyname = 'labels_delete_creator_and_tenant'
  ) THEN
    CREATE POLICY labels_delete_creator_and_tenant
      ON public.labels
      FOR DELETE
      USING (
        (auth.jwt() ->> 'user_role') = 'admin'
        OR (
          tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
          AND created_by = auth.uid()
        )
      );
  END IF;
END;
$$;
