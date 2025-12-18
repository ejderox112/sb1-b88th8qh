-- =============================================================================
-- MIGRATION PART 3: RLS POLITIKALARI VE GRANTS
-- =============================================================================
-- Supabase Dashboard > SQL Editor'da calistirin
-- DIKKAT: PART 2'yi calistirdiktan sonra bu dosyayi calistirin
-- Tahmini sure: 30 saniye
-- =============================================================================

-- ============================================================
-- 1. RLS AKTIFLESTIRILMESI
-- ============================================================

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_edit_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. NOTIFICATION_SETTINGS POLITIKALARI
-- ============================================================

CREATE POLICY "Users can manage own notification settings" ON notification_settings
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 3. NOTIFICATIONS POLITIKALARI
-- ============================================================

CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 4. VENUE_SUGGESTIONS POLITIKALARI
-- ============================================================

CREATE POLICY "Users can read own venue suggestions" ON venue_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create venue suggestions" ON venue_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can moderate venue suggestions" ON venue_suggestions
  FOR ALL USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
  );

-- ============================================================
-- 5. FILE_UPLOADS POLITIKALARI
-- ============================================================

CREATE POLICY "Users can read own file uploads" ON file_uploads
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own file uploads" ON file_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. FRIEND_REQUESTS POLITIKALARI
-- ============================================================

CREATE POLICY "Users can manage own friend requests" ON friend_requests
  FOR ALL USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- ============================================================
-- 7. BLOCKS POLITIKALARI
-- ============================================================

CREATE POLICY "Users can manage own blocks" ON blocks
  FOR ALL USING (auth.uid() = blocker_id);

-- ============================================================
-- 8. ABUSE_REPORTS POLITIKALARI
-- ============================================================

CREATE POLICY "Users can create abuse reports" ON abuse_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage abuse reports" ON abuse_reports
  FOR ALL USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
  );

-- ============================================================
-- 9. USER_RESTRICTIONS POLITIKALARI
-- ============================================================

CREATE POLICY "Users can view own restrictions" ON user_restrictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage restrictions" ON user_restrictions
  FOR ALL USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
  );

-- ============================================================
-- 10. IP_BANS POLITIKALARI
-- ============================================================

CREATE POLICY "Admins can manage ip bans" ON ip_bans
  FOR ALL USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
  );

-- ============================================================
-- 11. ADMIN_NOTIFICATIONS POLITIKALARI
-- ============================================================

CREATE POLICY "Admins can manage notifications" ON admin_notifications
  FOR ALL USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
  );

-- ============================================================
-- 12. LOCATION_EDIT_HISTORY POLITIKALARI
-- ============================================================

CREATE POLICY "Admins can view location history" ON location_edit_history
  FOR SELECT USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
  );

-- ============================================================
-- 13. USER_PROFILES GUNCELLEMELER
-- ============================================================

-- Herkese profil goruntuleme izni
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
  FOR SELECT USING (true);

-- Kullanicilar kendi profillerini guncelleyebilir
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 14. GRANTS (TABLO ERISIM IZINLERI)
-- ============================================================

GRANT ALL ON notification_settings TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT SELECT, INSERT ON venue_suggestions TO authenticated;
GRANT ALL ON venue_suggestions TO authenticated;
GRANT SELECT, INSERT ON file_uploads TO authenticated;
GRANT ALL ON friend_requests TO authenticated;
GRANT ALL ON blocks TO authenticated;
GRANT INSERT ON abuse_reports TO authenticated;
GRANT ALL ON abuse_reports TO authenticated;
GRANT SELECT ON user_restrictions TO authenticated;
GRANT ALL ON user_restrictions TO authenticated;
GRANT ALL ON ip_bans TO authenticated;
GRANT ALL ON admin_notifications TO authenticated;
GRANT SELECT ON location_edit_history TO authenticated;

-- ============================================================
-- 15. MEVCUT KULLANICILARI DOLDUR
-- ============================================================

INSERT INTO user_profiles (id, email, nickname, full_name, created_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as nickname,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 16. ADMIN USERNAME AYARLA (SEEKMASTER)
-- ============================================================

UPDATE user_profiles 
SET admin_username = 'seekmaster'
WHERE email = 'ejderha112@gmail.com';

-- ============================================================
-- BASARI MESAJI
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE ' PART 3: RLS POLITIKALARI BASARIYLA OLUSTURULDU!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tamamlanan islemler:';
  RAISE NOTICE '  - 11 tablo icin RLS aktif edildi';
  RAISE NOTICE '  - 20+ RLS politikasi olusturuldu';
  RAISE NOTICE '  - Tablo erisim izinleri verildi (GRANTS)';
  RAISE NOTICE '  - Mevcut kullanicilar user_profiles e aktarildi';
  RAISE NOTICE '  - Admin username ayarlandi (seekmaster)';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE ' TUM MIGRATION TAMAMLANDI!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Olusturulan toplam kaynak:';
  RAISE NOTICE '  - 12 yeni tablo';
  RAISE NOTICE '  - 4 yeni kolon (user_profiles)';
  RAISE NOTICE '  - 11 trigger fonksiyonu';
  RAISE NOTICE '  - 2 view (user_profiles_public, admin_chat_messages)';
  RAISE NOTICE '  - 1 arama fonksiyonu (search_users_safe)';
  RAISE NOTICE '  - 20+ RLS politikasi';
  RAISE NOTICE '';
  RAISE NOTICE 'ONEMLI NOTLAR:';
  RAISE NOTICE '  - Admin email: ejderha112@gmail.com';
  RAISE NOTICE '  - Admin username: seekmaster';
  RAISE NOTICE '  - Rate limit: 5 venue onerisi/saat';
  RAISE NOTICE '  - Otomatik ban: 3 uyari = 7 gun ban';
  RAISE NOTICE '  - Dosya limitleri: Avatar 2MB, Blueprint 10MB, Photo 5MB';
  RAISE NOTICE '';
  RAISE NOTICE 'SISTEM HAZIR! Uygulamanizi test edebilirsiniz.';
  RAISE NOTICE '============================================';
END $$;
