-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  doc_type text NOT NULL, -- e.g. 'privacy_policy', 'terms_of_service', 'data_processing_agreement'
  version text NOT NULL, -- e.g. 'v1.0', '2025-10-01'
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_legal_documents_tenant_type ON public.legal_documents(tenant_id, doc_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS legal_documents_select_policy ON public.legal_documents;
DROP POLICY IF EXISTS legal_documents_insert_policy ON public.legal_documents;
DROP POLICY IF EXISTS legal_documents_update_policy ON public.legal_documents;
DROP POLICY IF EXISTS legal_documents_delete_policy ON public.legal_documents;

CREATE POLICY legal_documents_select_policy
  ON public.legal_documents
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR (
      (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
      AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    )
  );

CREATE POLICY legal_documents_insert_policy
  ON public.legal_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );

CREATE POLICY legal_documents_update_policy
  ON public.legal_documents
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

CREATE POLICY legal_documents_delete_policy
  ON public.legal_documents
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    AND tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
  );