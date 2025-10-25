-- 1) Tablo Oluşturma
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN (
    'login_success', 'login_failure', 'password_change', '2fa_enabled', '2fa_disabled',
    'ip_blocked', 'session_terminated', 'token_revoked', 'suspicious_activity'
  )),
  event_details jsonb,
  ip_address text,
  user_agent text,
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2) RLS Etkinleştirme
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- 3) İndeks
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_type ON public.security_events(tenant_id, event_type);

-- 4) RLS Politikaları
DROP POLICY IF EXISTS security_events_select_policy ON public.security_events;

CREATE POLICY security_events_select_policy
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (current_setting('jwt.claims', true) ->> 'tenant_id')::uuid
    AND (
      user_id = (current_setting('jwt.claims', true) ->> 'sub')::uuid
      OR (current_setting('jwt.claims', true) ->> 'user_role') IN ('admin', 'security')
    )
  );