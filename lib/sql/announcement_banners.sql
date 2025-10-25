-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.announcement_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text, -- optional CTA
  variant text DEFAULT 'info', -- e.g. 'info', 'warning', 'success', 'error'
  is_active boolean DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.announcement_banners ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_announcement_banners_tenant_active ON public.announcement_banners(tenant_id, is_active);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS announcement_banners_select_policy ON public.announcement_banners;
DROP POLICY IF EXISTS announcement_banners_insert_policy ON public.announcement_banners;
DROP POLICY IF EXISTS announcement_banners_update_policy ON public.announcement_banners;
DROP POLICY IF EXISTS announcement_banners_delete_policy ON public.announcement_banners;

CREATE POLICY announcement_banners_select_policy
  ON public.announcement_banners
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid)
  );

CREATE POLICY announcement_banners_insert_policy
  ON public.announcement_banners
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY announcement_banners_update_policy
  ON public.announcement_banners
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY announcement_banners_delete_policy
  ON public.announcement_banners
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND created_by = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );