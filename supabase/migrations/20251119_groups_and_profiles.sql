-- Up migration: temel sosyal/grup şeması, RLS, indeksler, helper fonksiyonlar

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  first_name text,
  last_name text,
  display_name text,
  nickname text UNIQUE,
  user_code char(10) UNIQUE,
  gender text CHECK (gender IN ('female','male','nonbinary','other')),
  birth_year smallint,
  avatar_url text,
  trust_score smallint DEFAULT 0,
  level smallint DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_code ON public.profiles(user_code);
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON public.profiles(nickname);

CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  location_id uuid REFERENCES public.locations(id),
  visibility text CHECK (visibility IN ('public','invite_only')) DEFAULT 'public',
  status text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  verification_link text,
  verification_snapshot_url text,
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  daily_quota_used smallint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  muted boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text CHECK (type IN ('text','emoji','image')) DEFAULT 'text',
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_created ON public.group_messages (group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  invitee_email text,
  invite_code text UNIQUE,
  status text CHECK (status IN ('pending','accepted','revoked','expired')) DEFAULT 'pending',
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending','accepted','rejected','blocked')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (requester_id, receiver_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_friend_requests_pending_pair ON public.friend_requests(requester_id, receiver_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.live_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  is_sharing boolean DEFAULT true,
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_locations_user ON public.live_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_group ON public.live_locations(group_id);

CREATE TABLE IF NOT EXISTS public.group_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES auth.users(id),
  target_id uuid REFERENCES auth.users(id),
  route_geojson jsonb NOT NULL,
  status text CHECK (status IN ('pending','ready','rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_group_routes_group ON public.group_routes(group_id);
CREATE INDEX IF NOT EXISTS idx_group_routes_requester ON public.group_routes(requester_id);

-- Helper functions
CREATE OR REPLACE FUNCTION public.current_auth_uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.current_auth_uid() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_auth_uid() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid, p_user_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_user_id AND gm.role IN ('owner','admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated;

-- Enable RLS and create policies (profiles, groups, group_members, group_messages, group_invites, friend_requests, live_locations, group_routes)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (public.current_auth_uid()));

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (public.current_auth_uid()))
  WITH CHECK (id = (public.current_auth_uid()));

CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (public.current_auth_uid()));

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY groups_select_public ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    (status = 'approved' AND visibility = 'public')
    OR created_by = public.current_auth_uid()
    OR approved_by = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = public.groups.id AND gm.user_id = public.current_auth_uid()
    )
  );

CREATE POLICY groups_insert_auth ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = public.current_auth_uid());

CREATE POLICY groups_update_admin ON public.groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = public.groups.id AND gm.user_id = public.current_auth_uid() AND gm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = public.groups.id AND gm.user_id = public.current_auth_uid() AND gm.role = 'owner'
    )
  );

CREATE POLICY groups_delete_owner ON public.groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = public.groups.id AND gm.user_id = public.current_auth_uid() AND gm.role = 'owner'
    )
  );

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY gm_select_self_or_admin ON public.group_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = public.group_members.group_id
        AND gm2.user_id = public.current_auth_uid()
        AND gm2.role IN ('owner','admin')
    )
  );

CREATE POLICY gm_insert_self_or_admin ON public.group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = public.group_members.group_id
        AND gm2.user_id = public.current_auth_uid()
        AND gm2.role IN ('owner','admin')
    )
  );

CREATE POLICY gm_update_admin ON public.group_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = public.group_members.group_id
        AND gm2.user_id = public.current_auth_uid()
        AND gm2.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = public.group_members.group_id
        AND gm2.user_id = public.current_auth_uid()
        AND gm2.role IN ('owner','admin')
    )
  );

CREATE POLICY gm_delete_admin ON public.group_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = public.group_members.group_id
        AND gm2.user_id = public.current_auth_uid()
        AND gm2.role IN ('owner','admin')
    )
  );

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY gm_messages_select_member ON public.group_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_messages.group_id
        AND gm.user_id = public.current_auth_uid()
    )
  );

CREATE POLICY gm_messages_insert_member ON public.group_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = public.current_auth_uid()
    AND EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_messages.group_id
        AND gm.user_id = public.current_auth_uid()
    )
  );

CREATE POLICY gm_messages_update_sender_or_admin ON public.group_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_messages.group_id
        AND gm.user_id = public.current_auth_uid()
        AND gm.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    sender_id = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_messages.group_id
        AND gm.user_id = public.current_auth_uid()
        AND gm.role IN ('owner','admin')
    )
  );

CREATE POLICY gm_messages_delete_sender_or_admin ON public.group_messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_messages.group_id
        AND gm.user_id = public.current_auth_uid()
        AND gm.role IN ('owner','admin')
    )
  );

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY invites_insert_admin ON public.group_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_invites.group_id
        AND gm.user_id = public.current_auth_uid()
        AND gm.role IN ('owner','admin')
    )
  );

CREATE POLICY invites_delete_admin ON public.group_invites
  FOR DELETE
  TO authenticated
  USING (
    created_by = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_invites.group_id
        AND gm.user_id = public.current_auth_uid()
        AND gm.role IN ('owner','admin')
    )
  );

CREATE POLICY invites_select_invitee_or_group ON public.group_invites
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = current_setting('request.jwt.claim.email', true)
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_invites.group_id
        AND gm.user_id = public.current_auth_uid()
    )
    OR created_by = public.current_auth_uid()
  );

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY fr_select_requester_or_receiver ON public.friend_requests
  FOR SELECT
  TO authenticated
  USING (
    requester_id = public.current_auth_uid()
    OR receiver_id = public.current_auth_uid()
  );

CREATE POLICY fr_insert_requester ON public.friend_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = public.current_auth_uid());

CREATE POLICY fr_update_requester_or_receiver ON public.friend_requests
  FOR UPDATE
  TO authenticated
  USING (
    requester_id = public.current_auth_uid()
    OR receiver_id = public.current_auth_uid()
  )
  WITH CHECK (
    requester_id = public.current_auth_uid()
    OR receiver_id = public.current_auth_uid()
  );

CREATE POLICY fr_delete_requester_or_receiver ON public.friend_requests
  FOR DELETE
  TO authenticated
  USING (
    requester_id = public.current_auth_uid()
    OR receiver_id = public.current_auth_uid()
  );

ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ll_insert_own ON public.live_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.current_auth_uid());

CREATE POLICY ll_update_own ON public.live_locations
  FOR UPDATE
  TO authenticated
  USING (user_id = public.current_auth_uid())
  WITH CHECK (user_id = public.current_auth_uid());

CREATE POLICY ll_select_shared_for_group ON public.live_locations
  FOR SELECT
  TO authenticated
  USING (
    (user_id = public.current_auth_uid())
    OR (
      is_sharing = true
      AND group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = public.live_locations.group_id
          AND gm.user_id = public.current_auth_uid()
      )
    )
  );

CREATE POLICY ll_delete_own_or_admin ON public.live_locations
  FOR DELETE
  TO authenticated
  USING (
    user_id = public.current_auth_uid()
    OR (
      group_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = public.live_locations.group_id
          AND gm.user_id = public.current_auth_uid()
          AND gm.role IN ('owner','admin')
      )
    )
  );

ALTER TABLE public.group_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY gr_insert_requester ON public.group_routes
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = public.current_auth_uid());

CREATE POLICY gr_select_requester_target_admin ON public.group_routes
  FOR SELECT
  TO authenticated
  USING (
    requester_id = public.current_auth_uid()
    OR target_id = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_routes.group_id
        AND gm.user_id = public.current_auth_uid()
    )
  );

CREATE POLICY gr_update_requester_or_admin ON public.group_routes
  FOR UPDATE
  TO authenticated
  USING (
    requester_id = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_routes.group_id
        AND gm.user_id = public.current_auth_uid()
        AND gm.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    requester_id = public.current_auth_uid()
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_routes.group_id
        AND gm.user_id = public.current_auth_uid()
        AND gm.role IN ('owner','admin')
    )
  );

CREATE POLICY gr_delete_admin ON public.group_routes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = public.group_routes.group_id
        AND gm.user_id = public.current_auth_uid()
        AND gm.role = 'owner'
    )
  );

-- End of migration
