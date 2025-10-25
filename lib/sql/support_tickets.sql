-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_status ON public.support_tickets(tenant_id, status);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS support_tickets_select_policy ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_insert_policy ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_update_policy ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_delete_policy ON public.support_tickets;

CREATE POLICY support_tickets_select_policy
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY support_tickets_insert_policy
  ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY support_tickets_update_policy
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  )
  WITH CHECK (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
    OR (
      tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
      AND user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
    )
  );

CREATE POLICY support_tickets_delete_policy
  ON public.support_tickets
  FOR DELETE
  TO authenticated
  USING (
    (current_setting('jwt.claims', true) ->> 'user_role') = 'admin'
  );