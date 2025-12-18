-- ============================================================
-- ADMIN SECURITY HARDENING - MAKSIMUM GÜVENLİK
-- ============================================================
-- Tarih: 2025-12-10
-- Amaç: Admin paneline sadece ejderha112@gmail.com erişebilir
-- Yöntem: Email-based RLS policies (NO role tables, NO JWT claims)
-- ============================================================

-- 1. Admin tablosunu temizle (artık kullanılmayacak)
-- Admin kontrolü sadece hardcoded email ile yapılacak
DROP TABLE IF EXISTS admin_users CASCADE;

-- 2. Admin Notifications tablosu için RLS politikaları
-- Sadece ejderha112@gmail.com admin_notifications tablosuna erişebilir

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Eski politikaları temizle
DROP POLICY IF EXISTS "Admin kullanıcılar admin_notifications okuyabilir" ON admin_notifications;
DROP POLICY IF EXISTS "Admin kullanıcılar admin_notifications güncelleyebilir" ON admin_notifications;
DROP POLICY IF EXISTS "Admin users can read notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admin users can update notifications" ON admin_notifications;

-- YENİ POLİTİKALAR - Sadece ejderha112@gmail.com
CREATE POLICY "Only main admin can read admin_notifications"
  ON admin_notifications
  FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can update admin_notifications"
  ON admin_notifications
  FOR UPDATE
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can delete admin_notifications"
  ON admin_notifications
  FOR DELETE
  USING (auth.email() = 'ejderha112@gmail.com');

-- 3. Locations tablosu için RLS politikaları
-- Herkes okuyabilir, sadece admin yazabilir

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Eski politikaları temizle
DROP POLICY IF EXISTS "Herkes aktif lokasyonları okuyabilir" ON locations;
DROP POLICY IF EXISTS "Admin kullanıcılar lokasyon oluşturabilir" ON locations;
DROP POLICY IF EXISTS "Admin kullanıcılar lokasyon güncelleyebilir" ON locations;
DROP POLICY IF EXISTS "Admin kullanıcılar lokasyon silebilir" ON locations;
DROP POLICY IF EXISTS "Public read active locations" ON locations;
DROP POLICY IF EXISTS "Admin users can manage locations" ON locations;

-- YENİ POLİTİKALAR
CREATE POLICY "Anyone can read active locations"
  ON locations
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only main admin can create locations"
  ON locations
  FOR INSERT
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can update locations"
  ON locations
  FOR UPDATE
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can delete locations"
  ON locations
  FOR DELETE
  USING (auth.email() = 'ejderha112@gmail.com');

-- 4. Location Edit History tablosu için RLS
-- Sadece admin okuyabilir

ALTER TABLE location_edit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin kullanıcılar lokasyon geçmişi okuyabilir" ON location_edit_history;
DROP POLICY IF EXISTS "Admin users can read location edit history" ON location_edit_history;

CREATE POLICY "Only main admin can read location_edit_history"
  ON location_edit_history
  FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');

-- 5. User Reports tablosu için RLS
-- Kullanıcılar kendi raporlarını görebilir, admin hepsini görebilir

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcılar kendi raporlarını okuyabilir" ON user_reports;
DROP POLICY IF EXISTS "Admin kullanıcılar tüm raporları okuyabilir" ON user_reports;
DROP POLICY IF EXISTS "Admin kullanıcılar raporları güncelleyebilir" ON user_reports;
DROP POLICY IF EXISTS "Users can read own reports" ON user_reports;
DROP POLICY IF EXISTS "Admin users can read all reports" ON user_reports;
DROP POLICY IF EXISTS "Admin users can update reports" ON user_reports;

CREATE POLICY "Users can insert their own reports"
  ON user_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can read their own reports"
  ON user_reports
  FOR SELECT
  USING (auth.uid() = reporter_id OR auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can update reports"
  ON user_reports
  FOR UPDATE
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

-- 6. User Restrictions tablosu için RLS
-- Sadece admin erişebilir

ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin kullanıcılar kısıtlamaları okuyabilir" ON user_restrictions;
DROP POLICY IF EXISTS "Admin kullanıcılar kısıtlamaları yönetebilir" ON user_restrictions;
DROP POLICY IF EXISTS "Admin users can read restrictions" ON user_restrictions;
DROP POLICY IF EXISTS "Admin users can manage restrictions" ON user_restrictions;

CREATE POLICY "Only main admin can read user_restrictions"
  ON user_restrictions
  FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can manage user_restrictions"
  ON user_restrictions
  FOR ALL
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

-- 7. Moderation Actions tablosu için RLS
-- Sadece admin erişebilir

ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin kullanıcılar moderasyon aksiyonlarını okuyabilir" ON moderation_actions;
DROP POLICY IF EXISTS "Admin kullanıcılar moderasyon aksiyonu oluşturabilir" ON moderation_actions;
DROP POLICY IF EXISTS "Admin users can read moderation_actions" ON moderation_actions;
DROP POLICY IF EXISTS "Admin users can create moderation_actions" ON moderation_actions;

CREATE POLICY "Only main admin can read moderation_actions"
  ON moderation_actions
  FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can create moderation_actions"
  ON moderation_actions
  FOR INSERT
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

-- 8. Venue Suggestions tablosu için RLS
-- Kullanıcılar kendi önerilerini görebilir, admin hepsini görebilir

ALTER TABLE venue_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcılar kendi venue önerilerini görebilir" ON venue_suggestions;
DROP POLICY IF EXISTS "Admin kullanıcılar tüm venue önerilerini yönetebilir" ON venue_suggestions;
DROP POLICY IF EXISTS "Users can read own venue_suggestions" ON venue_suggestions;
DROP POLICY IF EXISTS "Admin users can manage venue_suggestions" ON venue_suggestions;

CREATE POLICY "Users can create venue_suggestions"
  ON venue_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own venue_suggestions"
  ON venue_suggestions
  FOR SELECT
  USING (auth.uid() = user_id OR auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can update venue_suggestions"
  ON venue_suggestions
  FOR UPDATE
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

-- 9. Indoor Map Suggestions tablosu için RLS
-- Kullanıcılar kendi önerilerini görebilir, admin hepsini görebilir

ALTER TABLE indoor_map_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcılar kendi indoor önerilerini görebilir" ON indoor_map_suggestions;
DROP POLICY IF EXISTS "Admin kullanıcılar tüm indoor önerilerini yönetebilir" ON indoor_map_suggestions;
DROP POLICY IF EXISTS "Users can read own indoor_suggestions" ON indoor_map_suggestions;
DROP POLICY IF EXISTS "Admin users can manage indoor_suggestions" ON indoor_map_suggestions;

CREATE POLICY "Users can create indoor_map_suggestions"
  ON indoor_map_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own indoor_map_suggestions"
  ON indoor_map_suggestions
  FOR SELECT
  USING (auth.uid() = user_id OR auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can update indoor_map_suggestions"
  ON indoor_map_suggestions
  FOR UPDATE
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

-- ============================================================
-- GÜVENLIK DOĞRULAMA SORULARI
-- ============================================================

-- Test 1: Admin email doğru mu?
SELECT 
  CASE 
    WHEN auth.email() = 'ejderha112@gmail.com' THEN '✅ Admin doğrulandı'
    ELSE '❌ Admin değil'
  END as admin_check;

-- Test 2: Hangi tablolar RLS korumalı?
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'admin_notifications',
    'locations',
    'location_edit_history',
    'user_reports',
    'user_restrictions',
    'moderation_actions',
    'venue_suggestions',
    'indoor_map_suggestions'
  )
ORDER BY tablename;

-- Test 3: Admin politikaları var mı?
SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%ejderha112@gmail.com%' THEN '✅ Email-based'
    ELSE '❌ Other method'
  END as security_method
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'admin_notifications',
    'locations',
    'user_reports',
    'user_restrictions',
    'moderation_actions'
  )
ORDER BY tablename, policyname;

-- ============================================================
-- NOTLAR
-- ============================================================
-- 1. admin_users tablosu tamamen kaldırıldı
-- 2. Tüm admin kontrolü hardcoded email ile yapılıyor
-- 3. RLS politikaları auth.email() fonksiyonu kullanıyor
-- 4. Hiçbir veritabanı kaydı admin yetkisi veremiyor
-- 5. JWT claims kullanılmıyor (daha güvenli)
-- 6. Frontend kontrolü sadece UI için, asıl güvenlik RLS'de
-- 7. Moderatör sistemi daha sonra eklenecek (şimdilik sadece admin)
-- ============================================================
