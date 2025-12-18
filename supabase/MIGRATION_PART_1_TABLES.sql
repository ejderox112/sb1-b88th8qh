-- =============================================================================
-- MIGRATION PART 1: TEMEL TABLOLAR (15 TABLO)
-- =============================================================================
-- Supabase Dashboard > SQL Editor'da calistirin
-- Tahmini sure: 30 saniye
-- =============================================================================

-- ============================================================
-- 1. BILDIRIM SISTEMI TABLOLARI
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_requests BOOLEAN DEFAULT true,
  friend_accepted BOOLEAN DEFAULT true,
  chat_messages BOOLEAN DEFAULT true,
  group_invites BOOLEAN DEFAULT true,
  task_completed BOOLEAN DEFAULT true,
  level_up BOOLEAN DEFAULT true,
  badge_earned BOOLEAN DEFAULT true,
  venue_suggestions BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================================
-- 2. VENUE ONERILERI TABLOSU
-- ============================================================

CREATE TABLE IF NOT EXISTS venue_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  venue_type TEXT CHECK (venue_type IN ('hospital', 'mall', 'airport', 'university', 'office', 'hotel', 'other')),
  description TEXT,
  floor_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  moderation_notes TEXT,
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_suggestions_user ON venue_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_suggestions_status ON venue_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_venue_suggestions_created ON venue_suggestions(created_at DESC);

-- ============================================================
-- 3. DOSYA YUKLEME GUVENLIK TABLOSU
-- ============================================================

CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  upload_type TEXT CHECK (upload_type IN ('blueprint', 'avatar', 'task_photo', 'venue_photo')),
  virus_scan_status TEXT DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'error')),
  virus_scan_result TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_hash ON file_uploads(file_hash);
CREATE INDEX IF NOT EXISTS idx_file_uploads_virus_status ON file_uploads(virus_scan_status);

-- ============================================================
-- 4. ARKADASLIK SISTEMI TABLOLARI
-- ============================================================

CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);

-- ============================================================
-- 5. RATE LIMITING TABLOSU
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action_type, window_start);

-- ============================================================
-- 6. SPAM/ABUSE DETECTION TABLOSU
-- ============================================================

CREATE TABLE IF NOT EXISTS abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT CHECK (report_type IN ('spam', 'harassment', 'inappropriate_content', 'fake_venue', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abuse_reports_status ON abuse_reports(status);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_reported_user ON abuse_reports(reported_user_id);

-- ============================================================
-- 7. USER RESTRICTIONS TABLOSU
-- ============================================================

CREATE TABLE IF NOT EXISTS user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  ban_expires_at TIMESTAMPTZ,
  can_send_messages BOOLEAN DEFAULT true,
  can_suggest_venues BOOLEAN DEFAULT true,
  can_upload_files BOOLEAN DEFAULT true,
  can_add_friends BOOLEAN DEFAULT true,
  can_create_groups BOOLEAN DEFAULT true,
  restriction_reason TEXT,
  restricted_by UUID REFERENCES auth.users(id),
  restricted_at TIMESTAMPTZ DEFAULT now(),
  last_warning_at TIMESTAMPTZ,
  warning_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_restrictions_user ON user_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_banned ON user_restrictions(is_banned) WHERE is_banned = true;

-- ============================================================
-- 8. IP BANS TABLOSU
-- ============================================================

CREATE TABLE IF NOT EXISTS ip_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_bans_ip ON ip_bans(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_bans_expires ON ip_bans(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- 9. ADMIN NOTIFICATIONS TABLOSU
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('user_report', 'venue_suggestion', 'indoor_suggestion', 'general_feedback', 'system_alert')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved', 'archived')),
  related_user_id UUID REFERENCES auth.users(id),
  related_item_id UUID,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON admin_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- ============================================================
-- 10. LOCATION EDIT HISTORY TABLOSU
-- ============================================================

CREATE TABLE IF NOT EXISTS location_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID,
  editor_id UUID REFERENCES auth.users(id),
  changes JSONB NOT NULL,
  edit_type TEXT CHECK (edit_type IN ('create', 'update', 'delete', 'indoor_map_update')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_location_history_location ON location_edit_history(location_id);
CREATE INDEX IF NOT EXISTS idx_location_history_editor ON location_edit_history(editor_id);

-- ============================================================
-- 11. USER_PROFILES EKSIK KOLONLAR
-- ============================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hide_email BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS admin_username TEXT;

-- Admin username unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_username_unique 
ON user_profiles(admin_username) 
WHERE admin_username IS NOT NULL;

-- ============================================================
-- BASARI MESAJI
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE ' PART 1: TABLOLAR BASARIYLA OLUSTURULDU!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Olusturulan tablolar:';
  RAISE NOTICE '  - notification_settings';
  RAISE NOTICE '  - notifications';
  RAISE NOTICE '  - venue_suggestions';
  RAISE NOTICE '  - file_uploads';
  RAISE NOTICE '  - friend_requests';
  RAISE NOTICE '  - blocks';
  RAISE NOTICE '  - rate_limits';
  RAISE NOTICE '  - abuse_reports';
  RAISE NOTICE '  - user_restrictions';
  RAISE NOTICE '  - ip_bans';
  RAISE NOTICE '  - admin_notifications';
  RAISE NOTICE '  - location_edit_history';
  RAISE NOTICE '';
  RAISE NOTICE 'Eklenen kolonlar:';
  RAISE NOTICE '  - user_profiles.full_name';
  RAISE NOTICE '  - user_profiles.hide_email';
  RAISE NOTICE '  - user_profiles.last_seen';
  RAISE NOTICE '  - user_profiles.admin_username';
  RAISE NOTICE '';
  RAISE NOTICE 'SONRAKI ADIM: MIGRATION_PART_2_TRIGGERS.sql dosyasini calistirin';
  RAISE NOTICE '============================================';
END $$;
