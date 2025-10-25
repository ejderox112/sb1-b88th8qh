-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.announcement_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  banner_type text CHECK (banner_type IN ('info', 'warning', 'success', 'error')),
  audience text CHECK (audience IN ('all', 'admins', 'users')),
  is_active boolean DEFAULT true,
  display_from timestamptz,
  display_until timestamptz,
  created_by uuid,
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
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY announcement_banners_insert_policy
  ON public.announcement_banners
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY announcement_banners_update_policy
  ON public.announcement_banners
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY announcement_banners_delete_policy
  ON public.announcement_banners
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );