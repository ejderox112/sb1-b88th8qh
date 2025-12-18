-- =============================================================================
-- MIGRATION PART 2: TRIGGERS VE FONKSIYONLAR
-- =============================================================================
-- Supabase Dashboard > SQL Editor'da calistirin
-- DIKKAT: PART 1'i calistirdiktan sonra bu dosyayi calistirin
-- Tahmini sure: 20 saniye
-- =============================================================================

-- ============================================================
-- 1. OTOMATIK PROFIL OLUSTURMA TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, nickname, full_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name',
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
-- 2. VENUE SUGGESTION RATE LIMIT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION check_venue_suggestion_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  suggestion_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO suggestion_count
  FROM venue_suggestions
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF suggestion_count >= 5 THEN
    RAISE EXCEPTION 'Saatte en fazla 5 mekan onerisi yapabilirsiniz';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_suggestion_rate_limit ON venue_suggestions;
CREATE TRIGGER check_suggestion_rate_limit
  BEFORE INSERT ON venue_suggestions
  FOR EACH ROW EXECUTE FUNCTION check_venue_suggestion_rate_limit();

-- ============================================================
-- 3. DOSYA BOYUTU LIMIT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION check_file_size_limit()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.upload_type
    WHEN 'blueprint' THEN
      IF NEW.file_size > 10485760 THEN
        RAISE EXCEPTION 'Blueprint dosyasi 10MB dan buyuk olamaz';
      END IF;
    WHEN 'avatar' THEN
      IF NEW.file_size > 2097152 THEN
        RAISE EXCEPTION 'Avatar dosyasi 2MB dan buyuk olamaz';
      END IF;
    WHEN 'task_photo' THEN
      IF NEW.file_size > 5242880 THEN
        RAISE EXCEPTION 'Gorev fotografi 5MB dan buyuk olamaz';
      END IF;
    WHEN 'venue_photo' THEN
      IF NEW.file_size > 5242880 THEN
        RAISE EXCEPTION 'Mekan fotografi 5MB dan buyuk olamaz';
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
-- 4. ADMIN NOTIFICATION - USER REPORT TRIGGER
-- ============================================================

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
    'Yeni Kullanici Sikayeti',
    'Sikayet kategorisi: ' || NEW.report_category || '. Ciddiyet: ' || NEW.severity,
    NEW.severity,
    NEW.reported_user_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOT: user_reports tablosu PART 3'te olusturulacak, bu trigger o zaman aktif olacak

-- ============================================================
-- 5. ADMIN NOTIFICATION - VENUE SUGGESTION TRIGGER
-- ============================================================

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
    'Yeni Mekan Onerisi',
    'Mekan: ' || NEW.name || ' (' || NEW.venue_type || ')',
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

-- ============================================================
-- 6. ADMIN NOTIFICATION - INDOOR SUGGESTION TRIGGER
-- ============================================================

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
    'Yeni Ic Mekan Onerisi',
    'Bina: ' || COALESCE(NEW.venue_id, 'Bilinmiyor') || ', Kat: ' || NEW.floor_id,
    'medium',
    NEW.submitted_by,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_notify_admin_on_indoor ON indoor_suggestions;
CREATE TRIGGER auto_notify_admin_on_indoor
  AFTER INSERT ON indoor_suggestions
  FOR EACH ROW EXECUTE FUNCTION create_admin_notification_for_indoor();

-- ============================================================
-- 7. OTOMATIK UYARI SAYACI TRIGGER
-- ============================================================

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

-- NOT: moderation_actions tablosu PART 3'te olusturulacak

-- ============================================================
-- 8. OTOMATIK BAN TRIGGER (3 UYARI = 7 GUN BAN)
-- ============================================================

CREATE OR REPLACE FUNCTION auto_ban_after_warnings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.warning_count >= 3 AND NEW.is_banned = false THEN
    UPDATE user_restrictions
    SET 
      is_banned = true,
      ban_reason = '3 uyari sonrasi otomatik ban',
      ban_expires_at = now() + interval '7 days'
    WHERE user_id = NEW.user_id;
    
    INSERT INTO admin_notifications (
      type,
      title,
      description,
      severity,
      related_user_id
    ) VALUES (
      'system_alert',
      'Otomatik Ban',
      'Kullanici 3 uyari sonrasi 7 gun banland',
      'high',
      NEW.user_id
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

-- ============================================================
-- 9. USER LAST SEEN GUNCELLEME TRIGGER
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

-- ============================================================
-- 10. KULLANICI ARAMA FONKSIYONU (MAIL GIZLEME DESTEKLI)
-- ============================================================

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
    (
      up.admin_username ILIKE '%' || search_term || '%'
      OR up.nickname ILIKE '%' || search_term || '%'
      OR up.user_code ILIKE '%' || search_term || '%'
      OR (up.hide_email = false AND up.email ILIKE '%' || search_term || '%')
      OR up.full_name ILIKE '%' || search_term || '%'
    )
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION search_users_safe TO authenticated;

-- ============================================================
-- 11. PUBLIC VIEW - USER_PROFILES_PUBLIC
-- ============================================================

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
  is_online,
  last_seen,
  location_sharing,
  admin_username,
  created_at
FROM user_profiles;

GRANT SELECT ON user_profiles_public TO authenticated;
GRANT SELECT ON user_profiles_public TO anon;

-- ============================================================
-- 12. ADMIN CHAT MESSAGES VIEW
-- ============================================================

CREATE OR REPLACE VIEW admin_chat_messages AS
SELECT 
  gm.id,
  gm.sender_id,
  gm.group_id,
  gm.content,
  gm.type,
  gm.created_at,
  sender.nickname as sender_nickname,
  sender.email as sender_email
FROM group_messages gm
LEFT JOIN user_profiles sender ON gm.sender_id = sender.auth_user_id;

-- ============================================================
-- BASARI MESAJI
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE ' PART 2: TRIGGERS VE FONKSIYONLAR BASARIYLA OLUSTURULDU!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Olusturulan fonksiyonlar:';
  RAISE NOTICE '  - handle_new_user()';
  RAISE NOTICE '  - check_venue_suggestion_rate_limit()';
  RAISE NOTICE '  - check_file_size_limit()';
  RAISE NOTICE '  - create_admin_notification_for_report()';
  RAISE NOTICE '  - create_admin_notification_for_venue()';
  RAISE NOTICE '  - create_admin_notification_for_indoor()';
  RAISE NOTICE '  - increment_warning_count()';
  RAISE NOTICE '  - auto_ban_after_warnings()';
  RAISE NOTICE '  - update_user_last_seen()';
  RAISE NOTICE '  - search_users_safe()';
  RAISE NOTICE '';
  RAISE NOTICE 'Olusturulan view ler:';
  RAISE NOTICE '  - user_profiles_public';
  RAISE NOTICE '  - admin_chat_messages';
  RAISE NOTICE '';
  RAISE NOTICE 'SONRAKI ADIM: MIGRATION_PART_3_RLS.sql dosyasini calistirin';
  RAISE NOTICE '============================================';
END $$;
