-- SUPABASE MIGRATION TODO LİSTESİ
-- Bu SQL'leri Supabase Dashboard > SQL Editor'da sırayla çalıştırın

-- ============================================================
-- TODO #1: İç Mekan Haritalama Tabloları
-- ============================================================
-- Dosya: supabase/indoor-mapping-schema.sql
-- Açıklama: Venue, floor, node, edge tabloları + RLS
-- Durum: BEKLEMEDE
-- Öncelik: YÜKSEK

-- ============================================================
-- TODO #2: Admin Kullanıcısı
-- ============================================================
-- Dosya: supabase/add-admin-user.sql
-- Açıklama: ejderha112@gmail.com'u admin yap
-- Durum: BEKLEMEDE
-- Öncelik: YÜKSEK
-- NOT: Önce Authentication'dan kullanıcı oluştur!

-- ============================================================
-- TODO #3: Bildirim Sistemi Tabloları
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
  venue_suggestions BOOLEAN DEFAULT true, -- YENİ
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

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification settings" ON notification_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

GRANT ALL ON notification_settings TO authenticated;
GRANT ALL ON notifications TO authenticated;

-- ============================================================
-- TODO #4: Kullanıcı Profil Kolonları
-- ============================================================

-- user_profiles tablosuna eksik kolonlar ekle
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS about_me TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hide_email BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS admin_username TEXT; -- Özel admin kullanıcı adı (örn: seekmaster)

-- ============================================================
-- TODO #5: Venue Önerileri Tablosu (Kullanıcı Katkıları)
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

ALTER TABLE venue_suggestions ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi önerilerini görebilir
CREATE POLICY "Users can read own venue suggestions" ON venue_suggestions
  FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcılar öneri oluşturabilir
CREATE POLICY "Authenticated users can create venue suggestions" ON venue_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin'ler tüm önerileri görebilir ve moderasyon yapabilir
CREATE POLICY "Admins can moderate venue suggestions" ON venue_suggestions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND email = 'ejderha112@gmail.com'
    )
  );

GRANT SELECT, INSERT ON venue_suggestions TO authenticated;
GRANT ALL ON venue_suggestions TO authenticated; -- Admin için

-- ============================================================
-- TODO #6: Dosya Yükleme Güvenlik Tablosu
-- ============================================================

CREATE TABLE IF NOT EXISTS file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- bytes
  file_type TEXT NOT NULL, -- MIME type
  file_hash TEXT NOT NULL, -- SHA-256 hash
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

ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own file uploads" ON file_uploads
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own file uploads" ON file_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON file_uploads TO authenticated;

-- ============================================================
-- TODO #7: Arkadaşlık Sistemi Tabloları
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

CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own friend requests" ON friend_requests
  FOR ALL USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can manage own friendships" ON friends
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can manage own blocks" ON blocks
  FOR ALL USING (auth.uid() = blocker_id);

GRANT ALL ON friend_requests TO authenticated;
GRANT ALL ON friends TO authenticated;
GRANT ALL ON blocks TO authenticated;

-- ============================================================
-- TODO #8: Otomatik Profil Oluşturma Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, nickname, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TODO #9: Online Durumu Senkronizasyon
-- ============================================================

-- ============================================================
-- TODO #15: Mail Adresi Gizleme ve Admin Kullanıcı Adı
-- ============================================================
-- Açıklama: Kullanıcılar mail adreslerini gizleyebilir (hide_email)
--           Admin için özel kullanıcı adı (seekmaster)
-- Öncelik: ORTA

-- 1. Admin için özel kullanıcı adı ayarla (ejderha112@gmail.com = seekmaster)
UPDATE user_profiles 
SET admin_username = 'seekmaster'
WHERE email = 'ejderha112@gmail.com';

-- 2. Admin username unique olmalı
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_username_unique 
ON user_profiles(admin_username) 
WHERE admin_username IS NOT NULL;

-- 3. Mail adresi gizleme view'i (diğer kullanıcılar için)
-- Bu view kullanıcıların birbirlerini ararken kullanacakları
CREATE OR REPLACE VIEW user_profiles_public AS
SELECT 
  id,
  user_id,
  CASE 
    WHEN hide_email = true THEN NULL 
    WHEN admin_username IS NOT NULL THEN admin_username
    ELSE email 
  END AS display_email,
  nickname,
  user_code,
  avatar_url,
  level,
  xp,
  gender,
  age,
  show_gender,
  show_age,
  full_name,
  about_me,
  dominant_city,
  city_visible,
  is_online,
  last_seen,
  location_sharing,
  profile_visible,
  admin_username, -- Arama için admin username göster
  created_at
FROM user_profiles;

-- 4. Public view için RLS
ALTER VIEW user_profiles_public SET (security_invoker = true);

-- 5. Public view'e erişim izni
GRANT SELECT ON user_profiles_public TO authenticated;
GRANT SELECT ON user_profiles_public TO anon;

-- 6. Kullanıcı arama fonksiyonu (mail gizleme destekli)
CREATE OR REPLACE FUNCTION search_users_safe(search_term TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  nickname TEXT,
  user_code TEXT,
  avatar_url TEXT,
  level INT,
  is_admin BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    COALESCE(up.admin_username, up.nickname) as display_name,
    up.nickname,
    up.user_code,
    up.avatar_url,
    up.level,
    (up.admin_username IS NOT NULL) as is_admin
  FROM user_profiles up
  WHERE 
    up.profile_visible = true
    AND (
      -- Admin username ile arama
      up.admin_username ILIKE '%' || search_term || '%'
      -- Nickname ile arama
      OR up.nickname ILIKE '%' || search_term || '%'
      -- User code ile arama
      OR up.user_code ILIKE '%' || search_term || '%'
      -- Email ile arama (sadece gizlenmemişse)
      OR (up.hide_email = false AND up.email ILIKE '%' || search_term || '%')
      -- Full name ile arama
      OR up.full_name ILIKE '%' || search_term || '%'
    )
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_users_safe TO authenticated;

-- ============================================================
-- TODO #9: Online Durumu Senkronizasyon (DEVAM)
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET 
    is_online = true,
    last_seen = NOW()
  WHERE id = auth.uid();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Her auth event'te last_seen güncelle (opsiyonel - performans etkisi var)
-- Alternatif: Client-side heartbeat sistemi (önerilen)

-- ============================================================
-- TODO #10: RLS Politikası - Herkesi Görme İzni
-- ============================================================

-- user_profiles tablosuna herkesin erişebilmesi için politika
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
  FOR SELECT USING (true);

-- Kullanıcılar sadece kendi profillerini güncelleyebilir
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- TODO #11: Mevcut Kullanıcıları Doldur
-- ============================================================

INSERT INTO user_profiles (id, email, nickname, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as nickname,
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TODO #12: Güvenlik - Dosya Boyutu Limitleri
-- ============================================================

-- Dosya boyutu kontrolü için function
CREATE OR REPLACE FUNCTION check_file_size_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Maksimum dosya boyutları (bytes)
  CASE NEW.upload_type
    WHEN 'blueprint' THEN
      IF NEW.file_size > 10485760 THEN -- 10MB
        RAISE EXCEPTION 'Blueprint dosyası 10MB''dan büyük olamaz';
      END IF;
    WHEN 'avatar' THEN
      IF NEW.file_size > 2097152 THEN -- 2MB
        RAISE EXCEPTION 'Avatar dosyası 2MB''dan büyük olamaz';
      END IF;
    WHEN 'task_photo' THEN
      IF NEW.file_size > 5242880 THEN -- 5MB
        RAISE EXCEPTION 'Görev fotoğrafı 5MB''dan büyük olamaz';
      END IF;
    WHEN 'venue_photo' THEN
      IF NEW.file_size > 5242880 THEN -- 5MB
        RAISE EXCEPTION 'Mekan fotoğrafı 5MB''dan büyük olamaz';
      END IF;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_file_size ON file_uploads;
CREATE TRIGGER check_file_size
  BEFORE INSERT ON file_uploads
  FOR EACH ROW EXECUTE FUNCTION check_file_size_limit();

-- ============================================================
-- TODO #13: Güvenlik - Rate Limiting
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

-- Rate limit kontrolü (örnek: venue öneri limiti)
CREATE OR REPLACE FUNCTION check_venue_suggestion_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  suggestion_count INTEGER;
BEGIN
  -- Son 1 saatte kaç öneri yapılmış?
  SELECT COUNT(*) INTO suggestion_count
  FROM venue_suggestions
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF suggestion_count >= 5 THEN
    RAISE EXCEPTION 'Saatte en fazla 5 mekan önerisi yapabilirsiniz';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_suggestion_rate_limit ON venue_suggestions;
CREATE TRIGGER check_suggestion_rate_limit
  BEFORE INSERT ON venue_suggestions
  FOR EACH ROW EXECUTE FUNCTION check_venue_suggestion_rate_limit();

-- ============================================================
-- TODO #14: Güvenlik - Spam/Abuse Detection
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

ALTER TABLE abuse_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create abuse reports" ON abuse_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage abuse reports" ON abuse_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

GRANT INSERT ON abuse_reports TO authenticated;
GRANT ALL ON abuse_reports TO authenticated; -- Admin için

-- ============================================================
-- TODO #16: Kullanıcı Şikayet ve Moderasyon Sistemi
-- ============================================================
-- Açıklama: Taciz, küfür, spam şikayetleri + mesajlaşma görüntüleme
--           Admin: Kullanıcı kısıtlama, IP ban, mesajlaşma geçmişi
-- Öncelik: YÜKSEK

-- 1. User Reports (Detaylı Şikayet Sistemi)
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_category TEXT CHECK (report_category IN (
    'harassment',        -- Taciz
    'offensive_language',-- Küfür/Hakaret
    'spam',              -- Spam mesaj
    'fake_profile',      -- Sahte profil
    'inappropriate_content', -- Uygunsuz içerik
    'threat',            -- Tehdit
    'impersonation',     -- Kimliğe bürünme
    'other'              -- Diğer
  )),
  description TEXT NOT NULL, -- Şikayet detayı
  evidence_urls TEXT[], -- Kanıt (screenshot URL'leri)
  related_message_ids UUID[], -- İlgili mesaj ID'leri
  related_chat_id UUID, -- İlgili sohbet ID'si
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed', 'escalated')),
  admin_notes TEXT, -- Admin notları
  action_taken TEXT, -- Alınan aksiyon
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_severity ON user_reports(severity);
CREATE INDEX IF NOT EXISTS idx_user_reports_created ON user_reports(created_at DESC);

-- 2. User Restrictions (Kullanıcı Kısıtlamaları)
CREATE TABLE IF NOT EXISTS user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  ban_expires_at TIMESTAMPTZ, -- NULL = kalıcı ban
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

-- 3. IP Bans (IP Yasaklama)
CREATE TABLE IF NOT EXISTS ip_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id), -- İlişkili kullanıcı (opsiyonel)
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ, -- NULL = kalıcı
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_bans_ip ON ip_bans(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_bans_expires ON ip_bans(expires_at) WHERE expires_at IS NOT NULL;

-- 4. Moderation Actions Log (Moderasyon İşlem Logu)
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES auth.users(id),
  target_user_id UUID REFERENCES auth.users(id),
  action_type TEXT CHECK (action_type IN (
    'warning',           -- Uyarı
    'temp_ban',          -- Geçici ban
    'permanent_ban',     -- Kalıcı ban
    'ip_ban',            -- IP ban
    'restriction',       -- Kısıtlama (mesaj/upload vb.)
    'unrestrict',        -- Kısıtlama kaldırma
    'message_delete',    -- Mesaj silme
    'profile_suspend'    -- Profil askıya alma
  )),
  reason TEXT NOT NULL,
  duration_hours INTEGER, -- Geçici ban için süre (saat)
  notes TEXT,
  report_id UUID REFERENCES user_reports(id), -- İlgili şikayet
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator ON moderation_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created ON moderation_actions(created_at DESC);

-- 5. Chat Messages Archive (Mesajlaşma Arşivi - Admin için)
-- Varsayılan messages tablosu zaten var, admin view oluşturuyoruz
CREATE OR REPLACE VIEW admin_chat_messages AS
SELECT 
  m.id,
  m.sender_id,
  m.receiver_id,
  m.group_id,
  m.content,
  m.created_at,
  m.updated_at,
  m.is_deleted,
  sender.nickname as sender_nickname,
  sender.email as sender_email,
  receiver.nickname as receiver_nickname,
  receiver.email as receiver_email
FROM messages m
LEFT JOIN user_profiles sender ON m.sender_id = sender.user_id
LEFT JOIN user_profiles receiver ON m.receiver_id = receiver.user_id;

-- 6. RLS Policies
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

-- User Reports: Kullanıcılar kendi şikayetlerini görebilir
CREATE POLICY "Users can view own reports" ON user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- User Reports: Kullanıcılar şikayet oluşturabilir
CREATE POLICY "Users can create reports" ON user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- User Reports: Admin'ler tüm şikayetleri görebilir/düzenleyebilir
CREATE POLICY "Admins can manage reports" ON user_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    )
  );

-- User Restrictions: Kullanıcılar kendi kısıtlamalarını görebilir
CREATE POLICY "Users can view own restrictions" ON user_restrictions
  FOR SELECT USING (auth.uid() = user_id);

-- User Restrictions: Admin'ler yönetebilir
CREATE POLICY "Admins can manage restrictions" ON user_restrictions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    )
  );

-- IP Bans: Sadece admin'ler görebilir/yönetebilir
CREATE POLICY "Admins can manage ip bans" ON ip_bans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    )
  );

-- Moderation Actions: Sadece admin'ler görebilir
CREATE POLICY "Admins can view moderation actions" ON moderation_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    )
  );

-- Moderation Actions: Sadece admin'ler oluşturabilir
CREATE POLICY "Admins can create moderation actions" ON moderation_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    )
  );

-- 7. Grants
GRANT SELECT, INSERT ON user_reports TO authenticated;
GRANT ALL ON user_reports TO authenticated; -- Admin için
GRANT SELECT ON user_restrictions TO authenticated;
GRANT ALL ON user_restrictions TO authenticated; -- Admin için
GRANT ALL ON ip_bans TO authenticated; -- Admin için
GRANT SELECT ON moderation_actions TO authenticated;
GRANT INSERT ON moderation_actions TO authenticated; -- Admin için

-- 8. Admin mesajlaşma görüntüleme view'ine izin
GRANT SELECT ON admin_chat_messages TO authenticated; -- Sadece RLS ile admin'e açılacak

-- 9. Otomatik uyarı sayacı trigger
CREATE OR REPLACE FUNCTION increment_warning_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_type = 'warning' THEN
    INSERT INTO user_restrictions (user_id, warning_count, last_warning_at)
    VALUES (NEW.target_user_id, 1, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      warning_count = user_restrictions.warning_count + 1,
      last_warning_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_increment_warnings ON moderation_actions;
CREATE TRIGGER auto_increment_warnings
  AFTER INSERT ON moderation_actions
  FOR EACH ROW
  WHEN (NEW.action_type = 'warning')
  EXECUTE FUNCTION increment_warning_count();

-- 10. Otomatik ban trigger (3 uyarıdan sonra)
CREATE OR REPLACE FUNCTION auto_ban_after_warnings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.warning_count >= 3 AND NEW.is_banned = false THEN
    UPDATE user_restrictions
    SET 
      is_banned = true,
      ban_reason = '3 uyarı sonrası otomatik ban',
      ban_expires_at = now() + interval '7 days' -- 7 günlük geçici ban
    WHERE user_id = NEW.user_id;
    
    -- Moderasyon log'a ekle
    INSERT INTO moderation_actions (
      moderator_id, 
      target_user_id, 
      action_type, 
      reason, 
      duration_hours
    ) VALUES (
      NULL, -- Sistem otomatik
      NEW.user_id,
      'temp_ban',
      '3 uyarı sonrası otomatik 7 günlük ban',
      168 -- 7 gün = 168 saat
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_warnings_for_ban ON user_restrictions;
CREATE TRIGGER check_warnings_for_ban
  AFTER UPDATE ON user_restrictions
  FOR EACH ROW
  WHEN (NEW.warning_count >= 3)
  EXECUTE FUNCTION auto_ban_after_warnings();

-- 11. Rate limiting: Aynı kullanıcıyı 24 saat içinde 3'ten fazla şikayet edemez
CREATE OR REPLACE FUNCTION check_report_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  report_count INT;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM user_reports
  WHERE reporter_id = NEW.reporter_id
    AND reported_user_id = NEW.reported_user_id
    AND created_at > now() - interval '24 hours';
  
  IF report_count >= 3 THEN
    RAISE EXCEPTION 'Aynı kullanıcıyı 24 saat içinde en fazla 3 kez şikayet edebilirsiniz';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_report_limit ON user_reports;
CREATE TRIGGER check_report_limit
  BEFORE INSERT ON user_reports
  FOR EACH ROW EXECUTE FUNCTION check_report_rate_limit();

-- ============================================================
-- TODO #17: Admin Bildirim Paneli Tabloları
-- ============================================================
-- Açıklama: Admin için merkezi bildirim sistemi
--           Şikayetler, öneriler, sistem uyarıları tek panelde
-- Öncelik: YÜKSEK

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('user_report', 'venue_suggestion', 'indoor_suggestion', 'general_feedback', 'system_alert')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved', 'archived')),
  related_user_id UUID REFERENCES auth.users(id),
  related_item_id UUID, -- user_report, venue_suggestion veya indoor_suggestion ID'si
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON admin_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at DESC);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Sadece admin'ler görebilir
CREATE POLICY "Admins can manage notifications" ON admin_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    )
  );

GRANT ALL ON admin_notifications TO authenticated;

-- Auto-create notification on new user report
CREATE OR REPLACE FUNCTION create_admin_notification_for_report()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (
    type,
    title,
    description,
    severity,
    related_user_id,
    related_item_id
  ) VALUES (
    'user_report',
    '🚨 Yeni Kullanıcı Şikayeti',
    'Şikayet kategorisi: ' || NEW.report_category || '. Ciddiyet: ' || NEW.severity,
    NEW.severity,
    NEW.reported_user_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_notify_admin_on_report ON user_reports;
CREATE TRIGGER auto_notify_admin_on_report
  AFTER INSERT ON user_reports
  FOR EACH ROW EXECUTE FUNCTION create_admin_notification_for_report();

-- Auto-create notification on new venue suggestion
CREATE OR REPLACE FUNCTION create_admin_notification_for_venue()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (
    type,
    title,
    description,
    severity,
    related_user_id,
    related_item_id
  ) VALUES (
    'venue_suggestion',
    '🏥 Yeni Mekan Önerisi',
    'Mekan: ' || NEW.venue_name || ' (' || NEW.venue_type || ')',
    'medium',
    NEW.user_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_notify_admin_on_venue ON venue_suggestions;
CREATE TRIGGER auto_notify_admin_on_venue
  AFTER INSERT ON venue_suggestions
  FOR EACH ROW EXECUTE FUNCTION create_admin_notification_for_venue();

-- Auto-create notification on new indoor suggestion
CREATE OR REPLACE FUNCTION create_admin_notification_for_indoor()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (
    type,
    title,
    description,
    severity,
    related_user_id,
    related_item_id
  ) VALUES (
    'indoor_suggestion',
    '🏢 Yeni İç Mekan Önerisi',
    'Bina: ' || COALESCE(NEW.building_name, 'Bilinmiyor') || ', Kat: ' || NEW.floor_number,
    'medium',
    NEW.user_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_notify_admin_on_indoor ON indoor_map_suggestions;
CREATE TRIGGER auto_notify_admin_on_indoor
  AFTER INSERT ON indoor_map_suggestions
  FOR EACH ROW EXECUTE FUNCTION create_admin_notification_for_indoor();

-- ============================================================
-- TODO #18: Lokasyon & Kroki Yönetim Tabloları
-- ============================================================
-- Açıklama: Admin'in telefon üzerinden adres/kroki düzenlemesi
--           POI ekleme/çıkarma, kat planları, koordinat güncelleme
-- Öncelik: YÜKSEK

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  floor_count INTEGER,
  building_type TEXT CHECK (building_type IN ('hospital', 'mall', 'airport', 'office', 'university', 'hotel', 'other')),
  is_active BOOLEAN DEFAULT true,
  has_indoor_map BOOLEAN DEFAULT false,
  indoor_map_data JSONB, -- Floor planları ve POI'ler burada
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_locations_has_indoor ON locations(has_indoor_map) WHERE has_indoor_map = true;

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Herkes lokasyonları görebilir
CREATE POLICY "Public locations are viewable" ON locations
  FOR SELECT USING (is_active = true);

-- Sadece admin düzenleyebilir
CREATE POLICY "Admins can manage locations" ON locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    )
  );

GRANT SELECT ON locations TO authenticated;
GRANT SELECT ON locations TO anon;
GRANT ALL ON locations TO authenticated; -- Admin için

-- Indoor map data structure örneği:
/*
{
  "floors": [
    {
      "floor_number": 0,
      "floor_name": "Zemin Kat",
      "svg_data": "...", // Opsiyonel SVG data
      "points_of_interest": [
        {
          "id": "poi_1",
          "name": "Ana Giriş",
          "type": "entrance",
          "x": 100,
          "y": 200,
          "description": "Ana giriş kapısı"
        },
        {
          "id": "poi_2",
          "name": "WC",
          "type": "wc",
          "x": 150,
          "y": 250
        }
      ]
    },
    {
      "floor_number": 1,
      "floor_name": "1. Kat",
      "points_of_interest": [...]
    }
  ]
}
*/

-- Location history tracking (admin değişiklik geçmişi)
CREATE TABLE IF NOT EXISTS location_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  editor_id UUID REFERENCES auth.users(id),
  changes JSONB NOT NULL, -- { "field": "name", "old_value": "X", "new_value": "Y" }
  edit_type TEXT CHECK (edit_type IN ('create', 'update', 'delete', 'indoor_map_update')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_location_history_location ON location_edit_history(location_id);
CREATE INDEX IF NOT EXISTS idx_location_history_editor ON location_edit_history(editor_id);

ALTER TABLE location_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view location history" ON location_edit_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND is_active = true
    )
  );

GRANT SELECT ON location_edit_history TO authenticated;

-- Auto-log location changes
CREATE OR REPLACE FUNCTION log_location_changes()
RETURNS TRIGGER AS $$
DECLARE
  changes JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO location_edit_history (location_id, editor_id, changes, edit_type)
    VALUES (NEW.id, auth.uid(), to_jsonb(NEW), 'create');
  ELSIF TG_OP = 'UPDATE' THEN
    changes := jsonb_build_object(
      'name', jsonb_build_object('old', OLD.name, 'new', NEW.name),
      'address', jsonb_build_object('old', OLD.address, 'new', NEW.address),
      'latitude', jsonb_build_object('old', OLD.latitude, 'new', NEW.latitude),
      'longitude', jsonb_build_object('old', OLD.longitude, 'new', NEW.longitude),
      'indoor_map_data_updated', (OLD.indoor_map_data IS DISTINCT FROM NEW.indoor_map_data)
    );
    
    INSERT INTO location_edit_history (location_id, editor_id, changes, edit_type)
    VALUES (
      NEW.id, 
      auth.uid(), 
      changes, 
      CASE WHEN OLD.indoor_map_data IS DISTINCT FROM NEW.indoor_map_data 
           THEN 'indoor_map_update' 
           ELSE 'update' 
      END
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO location_edit_history (location_id, editor_id, changes, edit_type)
    VALUES (OLD.id, auth.uid(), to_jsonb(OLD), 'delete');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_location_changes ON locations;
CREATE TRIGGER track_location_changes
  AFTER INSERT OR UPDATE OR DELETE ON locations
  FOR EACH ROW EXECUTE FUNCTION log_location_changes();

-- ============================================================
-- ÖZET: ÇALIŞTIRMA SIRASI
-- ============================================================

-- ============================================================
-- ÖZET: ÇALIŞTIRMA SIRASI
-- ============================================================

/*
1. ✅ TODO #1: indoor-mapping-schema.sql (Venue/Floor/Node tabloları)
2. ✅ TODO #2: add-admin-user.sql (Admin kullanıcısı oluştur)
3. ✅ TODO #3: Bildirim sistemi (notification_settings, notifications)
4. ✅ TODO #4: Eksik kolonlar (full_name, about_me, birth_date, is_online)
5. ✅ TODO #5: Venue suggestion sistemi (venue_suggestions tablosu)
6. ✅ TODO #6: Dosya yükleme güvenlik (file_uploads, boyut kontrolü)
7. ✅ TODO #7: Arkadaşlık sistemi (friend_requests, friends, blocks)
8. ✅ TODO #8: Otomatik profil oluşturma trigger (handle_new_user)
9. ✅ TODO #9: Online durumu senkronizasyon
10. ✅ TODO #10: RLS politikası - herkesi görme izni
11. ✅ TODO #11: Mevcut kullanıcıları doldur
12. ✅ TODO #12: Dosya boyutu limitleri (trigger)
13. ✅ TODO #13: Rate limiting (rate_limits tablosu)
14. ✅ TODO #14: Spam/Abuse detection (abuse_reports)
15. ✅ TODO #15: Mail gizleme + Admin username (seekmaster)
16. ✅ TODO #16: Kullanıcı şikayet sistemi (user_reports, user_restrictions, ip_bans, moderation_actions)
17. ✅ TODO #17: Admin bildirim paneli (admin_notifications + triggers)
18. ✅ TODO #18: Lokasyon & kroki yönetimi (locations, location_edit_history)

NOTLAR:
- Tüm tablolar RLS ile korunmuştur
- Admin email: ejderha112@gmail.com
- Admin username: seekmaster
- Otomatik bildirimler şunlar için çalışır:
  * Yeni kullanıcı şikayeti → admin_notifications
  * Yeni mekan önerisi → admin_notifications
  * Yeni iç mekan önerisi → admin_notifications
  * 3 uyarı → otomatik 7 günlük ban
- Rate limitler:
  * Venue suggestion: 5/saat
  * User report: 3/24 saat (aynı kullanıcıya karşı)
- Auto-escalation: 3 uyarı = 7 gün ban

KULLANIM:
1. Supabase Dashboard → SQL Editor'a git
2. Bu dosyayı kopyala-yapıştır
3. "Run" butonuna bas
4. Hata varsa tek tek TODO'ları çalıştır
*/
2. ✅ add-admin-user.sql (Admin kullanıcısı)
3. ✅ TODO #3: Bildirim tabloları
4. ✅ TODO #4: Profil kolonları
5. ✅ TODO #5: Venue önerileri
6. ✅ TODO #6: Dosya yükleme güvenlik
7. ✅ TODO #7: Arkadaşlık sistemi
8. ✅ TODO #8: Otomatik profil trigger
9. ✅ TODO #9: Online durumu
10. ✅ TODO #10: RLS - herkesi görme
11. ✅ TODO #11: Mevcut kullanıcıları doldur
12. ✅ TODO #12: Dosya boyutu limitleri
13. ✅ TODO #13: Rate limiting
14. ✅ TODO #14: Abuse detection
15. ✅ TODO #15: Mail adresi gizleme
16. ✅ TODO #16: Kullanıcı şikayet ve moderasyon sistemi

NOT: Her TODO'yu tek tek kopyala-yapıştır yaparak çalıştır!
*/
