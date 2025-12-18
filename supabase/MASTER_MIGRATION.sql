-- ============================================================
-- MASTER MIGRATION - Tüm Güvenlik ve Rate Limiting
-- ============================================================
-- Tarih: 2025-12-10
-- Açıklama: Bu dosyayı Supabase SQL Editor'da çalıştır
-- Süre: ~10 saniye
-- ============================================================
-- İçerik:
-- 1. Admin güvenlik sıkılaştırma (admin_users kaldır + RLS)
-- 2. Rate limiting sistemi (spam koruması)
-- ============================================================

-- ============================================================
-- PART 1: ADMIN SECURITY HARDENING
-- ============================================================

-- 1. Admin tablosunu temizle
DROP TABLE IF EXISTS admin_users CASCADE;

-- 2. Admin Notifications RLS
ALTER TABLE IF EXISTS admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin kullanıcılar admin_notifications okuyabilir" ON admin_notifications;
DROP POLICY IF EXISTS "Admin kullanıcılar admin_notifications güncelleyebilir" ON admin_notifications;
DROP POLICY IF EXISTS "Admin users can read notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admin users can update notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Only main admin can read admin_notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Only main admin can update admin_notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Only main admin can delete admin_notifications" ON admin_notifications;

CREATE POLICY "Only main admin can read admin_notifications"
  ON admin_notifications FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can update admin_notifications"
  ON admin_notifications FOR UPDATE
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can delete admin_notifications"
  ON admin_notifications FOR DELETE
  USING (auth.email() = 'ejderha112@gmail.com');

-- 3. Locations RLS
ALTER TABLE IF EXISTS locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes aktif lokasyonları okuyabilir" ON locations;
DROP POLICY IF EXISTS "Admin kullanıcılar lokasyon oluşturabilir" ON locations;
DROP POLICY IF EXISTS "Admin kullanıcılar lokasyon güncelleyebilir" ON locations;
DROP POLICY IF EXISTS "Admin kullanıcılar lokasyon silebilir" ON locations;
DROP POLICY IF EXISTS "Anyone can read active locations" ON locations;
DROP POLICY IF EXISTS "Only main admin can create locations" ON locations;
DROP POLICY IF EXISTS "Only main admin can update locations" ON locations;
DROP POLICY IF EXISTS "Only main admin can delete locations" ON locations;

CREATE POLICY "Anyone can read active locations"
  ON locations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only main admin can create locations"
  ON locations FOR INSERT
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can update locations"
  ON locations FOR UPDATE
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can delete locations"
  ON locations FOR DELETE
  USING (auth.email() = 'ejderha112@gmail.com');

-- 4. Location Edit History RLS
ALTER TABLE IF EXISTS location_edit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin kullanıcılar lokasyon geçmişi okuyabilir" ON location_edit_history;
DROP POLICY IF EXISTS "Only main admin can read location_edit_history" ON location_edit_history;

CREATE POLICY "Only main admin can read location_edit_history"
  ON location_edit_history FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');

-- 5. User Reports RLS
ALTER TABLE IF EXISTS user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcılar kendi raporlarını okuyabilir" ON user_reports;
DROP POLICY IF EXISTS "Admin kullanıcılar tüm raporları okuyabilir" ON user_reports;
DROP POLICY IF EXISTS "Admin kullanıcılar raporları güncelleyebilir" ON user_reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON user_reports;
DROP POLICY IF EXISTS "Users can read their own reports" ON user_reports;
DROP POLICY IF EXISTS "Only main admin can update reports" ON user_reports;

CREATE POLICY "Users can insert their own reports"
  ON user_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can read their own reports"
  ON user_reports FOR SELECT
  USING (auth.uid() = reporter_id OR auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can update reports"
  ON user_reports FOR UPDATE
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

-- 6. User Restrictions RLS
ALTER TABLE IF EXISTS user_restrictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin kullanıcılar kısıtlamaları okuyabilir" ON user_restrictions;
DROP POLICY IF EXISTS "Admin kullanıcılar kısıtlamaları yönetebilir" ON user_restrictions;
DROP POLICY IF EXISTS "Only main admin can read user_restrictions" ON user_restrictions;
DROP POLICY IF EXISTS "Only main admin can manage user_restrictions" ON user_restrictions;

CREATE POLICY "Only main admin can read user_restrictions"
  ON user_restrictions FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can manage user_restrictions"
  ON user_restrictions FOR ALL
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

-- 7. Moderation Actions RLS
ALTER TABLE IF EXISTS moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin kullanıcılar moderasyon aksiyonlarını okuyabilir" ON moderation_actions;
DROP POLICY IF EXISTS "Admin kullanıcılar moderasyon aksiyonu oluşturabilir" ON moderation_actions;
DROP POLICY IF EXISTS "Only main admin can read moderation_actions" ON moderation_actions;
DROP POLICY IF EXISTS "Only main admin can create moderation_actions" ON moderation_actions;

CREATE POLICY "Only main admin can read moderation_actions"
  ON moderation_actions FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can create moderation_actions"
  ON moderation_actions FOR INSERT
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

-- 8. Venue Suggestions RLS
ALTER TABLE IF EXISTS venue_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcılar kendi venue önerilerini görebilir" ON venue_suggestions;
DROP POLICY IF EXISTS "Admin kullanıcılar tüm venue önerilerini yönetebilir" ON venue_suggestions;
DROP POLICY IF EXISTS "Users can create venue_suggestions" ON venue_suggestions;
DROP POLICY IF EXISTS "Users can read their own venue_suggestions" ON venue_suggestions;
DROP POLICY IF EXISTS "Only main admin can update venue_suggestions" ON venue_suggestions;

CREATE POLICY "Users can create venue_suggestions"
  ON venue_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own venue_suggestions"
  ON venue_suggestions FOR SELECT
  USING (auth.uid() = user_id OR auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can update venue_suggestions"
  ON venue_suggestions FOR UPDATE
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

-- 9. Indoor Map Suggestions RLS
ALTER TABLE IF EXISTS indoor_map_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcılar kendi indoor önerilerini görebilir" ON indoor_map_suggestions;
DROP POLICY IF EXISTS "Admin kullanıcılar tüm indoor önerilerini yönetebilir" ON indoor_map_suggestions;
DROP POLICY IF EXISTS "Users can create indoor_map_suggestions" ON indoor_map_suggestions;
DROP POLICY IF EXISTS "Users can read their own indoor_map_suggestions" ON indoor_map_suggestions;
DROP POLICY IF EXISTS "Only main admin can update indoor_map_suggestions" ON indoor_map_suggestions;

CREATE POLICY "Users can create indoor_map_suggestions"
  ON indoor_map_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own indoor_map_suggestions"
  ON indoor_map_suggestions FOR SELECT
  USING (auth.uid() = user_id OR auth.email() = 'ejderha112@gmail.com');

CREATE POLICY "Only main admin can update indoor_map_suggestions"
  ON indoor_map_suggestions FOR UPDATE
  USING (auth.email() = 'ejderha112@gmail.com')
  WITH CHECK (auth.email() = 'ejderha112@gmail.com');

-- ============================================================
-- PART 2: RATE LIMITING SYSTEM
-- ============================================================

-- 1. Rate Limit Tablosu
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK(action_type IN ('user_report', 'venue_suggestion', 'indoor_suggestion')),
  action_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now(),
  last_action_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, action_type)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- 2. Rate Limit Kontrolü
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_max_count INTEGER DEFAULT 5,
  p_window_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  SELECT action_count, window_start
  INTO v_current_count, v_window_start
  FROM rate_limits
  WHERE user_id = p_user_id AND action_type = p_action_type;

  IF v_window_start IS NULL OR v_window_start < now() - (p_window_hours || ' hours')::INTERVAL THEN
    INSERT INTO rate_limits (user_id, action_type, action_count, window_start)
    VALUES (p_user_id, p_action_type, 1, now())
    ON CONFLICT (user_id, action_type)
    DO UPDATE SET 
      action_count = 1,
      window_start = now(),
      last_action_at = now();
    RETURN TRUE;
  END IF;

  IF v_current_count >= p_max_count THEN
    RETURN FALSE;
  END IF;

  UPDATE rate_limits
  SET action_count = action_count + 1,
      last_action_at = now()
  WHERE user_id = p_user_id AND action_type = p_action_type;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. Report Rate Limit Trigger
DROP TRIGGER IF EXISTS report_rate_limit_trigger ON user_reports;

CREATE OR REPLACE FUNCTION enforce_report_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_can_proceed BOOLEAN;
  v_reset_time TIMESTAMPTZ;
BEGIN
  v_can_proceed := check_rate_limit(NEW.reporter_id, 'user_report', 5, 24);

  IF NOT v_can_proceed THEN
    SELECT window_start + INTERVAL '24 hours'
    INTO v_reset_time
    FROM rate_limits
    WHERE user_id = NEW.reporter_id AND action_type = 'user_report';

    RAISE EXCEPTION '⏰ Rate limit aşıldı! 24 saatte en fazla 5 şikayet atabilirsin. Sıfırlanma: %', 
      to_char(v_reset_time, 'DD.MM.YYYY HH24:MI');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_rate_limit_trigger
BEFORE INSERT ON user_reports
FOR EACH ROW EXECUTE FUNCTION enforce_report_rate_limit();

-- 4. Venue Rate Limit Trigger
DROP TRIGGER IF EXISTS venue_rate_limit_trigger ON venue_suggestions;

CREATE OR REPLACE FUNCTION enforce_venue_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_can_proceed BOOLEAN;
  v_reset_time TIMESTAMPTZ;
BEGIN
  v_can_proceed := check_rate_limit(NEW.user_id, 'venue_suggestion', 10, 24);

  IF NOT v_can_proceed THEN
    SELECT window_start + INTERVAL '24 hours'
    INTO v_reset_time
    FROM rate_limits
    WHERE user_id = NEW.user_id AND action_type = 'venue_suggestion';

    RAISE EXCEPTION '⏰ Rate limit aşıldı! 24 saatte en fazla 10 mekan önerisi atabilirsin. Sıfırlanma: %',
      to_char(v_reset_time, 'DD.MM.YYYY HH24:MI');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_rate_limit_trigger
BEFORE INSERT ON venue_suggestions
FOR EACH ROW EXECUTE FUNCTION enforce_venue_rate_limit();

-- 5. Indoor Rate Limit Trigger
DROP TRIGGER IF EXISTS indoor_rate_limit_trigger ON indoor_map_suggestions;

CREATE OR REPLACE FUNCTION enforce_indoor_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_can_proceed BOOLEAN;
  v_reset_time TIMESTAMPTZ;
BEGIN
  v_can_proceed := check_rate_limit(NEW.user_id, 'indoor_suggestion', 5, 24);

  IF NOT v_can_proceed THEN
    SELECT window_start + INTERVAL '24 hours'
    INTO v_reset_time
    FROM rate_limits
    WHERE user_id = NEW.user_id AND action_type = 'indoor_suggestion';

    RAISE EXCEPTION '⏰ Rate limit aşıldı! 24 saatte en fazla 5 iç mekan önerisi atabilirsin. Sıfırlanma: %',
      to_char(v_reset_time, 'DD.MM.YYYY HH24:MI');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER indoor_rate_limit_trigger
BEFORE INSERT ON indoor_map_suggestions
FOR EACH ROW EXECUTE FUNCTION enforce_indoor_rate_limit();

-- 6. Rate Limit RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own rate limits" ON rate_limits;
DROP POLICY IF EXISTS "Admin can view all rate limits" ON rate_limits;

CREATE POLICY "Users can view their own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all rate limits"
  ON rate_limits FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');

-- 7. Rate Limit Sorgu Fonksiyonu
CREATE OR REPLACE FUNCTION get_my_rate_limits()
RETURNS TABLE (
  action_type TEXT,
  action_count INTEGER,
  max_count INTEGER,
  remaining INTEGER,
  window_start TIMESTAMPTZ,
  reset_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rl.action_type,
    rl.action_count,
    CASE 
      WHEN rl.action_type = 'user_report' THEN 5
      WHEN rl.action_type = 'venue_suggestion' THEN 10
      WHEN rl.action_type = 'indoor_suggestion' THEN 5
      ELSE 5
    END as max_count,
    CASE 
      WHEN rl.action_type = 'user_report' THEN 5 - rl.action_count
      WHEN rl.action_type = 'venue_suggestion' THEN 10 - rl.action_count
      WHEN rl.action_type = 'indoor_suggestion' THEN 5 - rl.action_count
      ELSE 5 - rl.action_count
    END as remaining,
    rl.window_start,
    rl.window_start + INTERVAL '24 hours' as reset_at
  FROM rate_limits rl
  WHERE rl.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Temizlik Fonksiyonu
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- BAŞARI MESAJI
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration tamamlandı!';
  RAISE NOTICE '✅ Admin güvenliği sıkılaştırıldı (sadece ejderha112@gmail.com)';
  RAISE NOTICE '✅ Rate limiting aktif (5 şikayet, 10 mekan, 5 indoor / 24 saat)';
  RAISE NOTICE '✅ RLS politikaları güncellendi';
  RAISE NOTICE '🎉 Sistem production ready!';
END $$;
