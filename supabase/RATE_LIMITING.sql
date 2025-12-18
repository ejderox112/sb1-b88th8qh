-- ============================================================
-- RATE LIMITING SİSTEMİ - Spam Koruması
-- ============================================================
-- Tarih: 2025-12-10
-- Amaç: Kullanıcıların spam şikayet/öneri göndermesini engellemek
-- Limit: 24 saatte 5 şikayet, 10 mekan önerisi
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

CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action_type);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- 2. Rate Limit Kontrolü (Function)
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
  -- Pencereyi kontrol et ve gerekirse sıfırla
  SELECT action_count, window_start
  INTO v_current_count, v_window_start
  FROM rate_limits
  WHERE user_id = p_user_id AND action_type = p_action_type;

  -- Kayıt yoksa veya pencere geçmişse sıfırla
  IF v_window_start IS NULL OR v_window_start < now() - (p_window_hours || ' hours')::INTERVAL THEN
    INSERT INTO rate_limits (user_id, action_type, action_count, window_start)
    VALUES (p_user_id, p_action_type, 1, now())
    ON CONFLICT (user_id, action_type)
    DO UPDATE SET 
      action_count = 1,
      window_start = now(),
      last_action_at = now();
    RETURN TRUE; -- İlk aksiyon, izin ver
  END IF;

  -- Limit kontrolü
  IF v_current_count >= p_max_count THEN
    RETURN FALSE; -- Limit aşıldı
  END IF;

  -- Count'u artır
  UPDATE rate_limits
  SET action_count = action_count + 1,
      last_action_at = now()
  WHERE user_id = p_user_id AND action_type = p_action_type;

  RETURN TRUE; -- İzin ver
END;
$$ LANGUAGE plpgsql;

-- 3. Kullanıcı Şikayeti Rate Limit (Trigger)
CREATE OR REPLACE FUNCTION enforce_report_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_can_proceed BOOLEAN;
  v_remaining INTEGER;
  v_reset_time TIMESTAMPTZ;
BEGIN
  -- Rate limit kontrolü (24 saatte 5 şikayet)
  v_can_proceed := check_rate_limit(NEW.reporter_id, 'user_report', 5, 24);

  IF NOT v_can_proceed THEN
    -- Kalan süre hesapla
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

-- 4. Mekan Önerisi Rate Limit (Trigger)
CREATE OR REPLACE FUNCTION enforce_venue_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_can_proceed BOOLEAN;
  v_reset_time TIMESTAMPTZ;
BEGIN
  -- Rate limit kontrolü (24 saatte 10 mekan önerisi)
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

-- 5. İç Mekan Önerisi Rate Limit (Trigger)
CREATE OR REPLACE FUNCTION enforce_indoor_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_can_proceed BOOLEAN;
  v_reset_time TIMESTAMPTZ;
BEGIN
  -- Rate limit kontrolü (24 saatte 5 indoor önerisi)
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

-- 6. RLS Politikaları
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi limitlerini görebilir
CREATE POLICY "Users can view their own rate limits"
  ON rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admin tüm limitleri görebilir
CREATE POLICY "Admin can view all rate limits"
  ON rate_limits
  FOR SELECT
  USING (auth.email() = 'ejderha112@gmail.com');

-- 7. Rate Limit Sorgu Fonksiyonu (Frontend için)
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

-- 8. Otomatik Temizlik (Eski kayıtları sil - 7 gün önceki)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Günlük otomatik temizlik için pg_cron extension gerekir (opsiyonel)
-- SELECT cron.schedule('cleanup-rate-limits', '0 2 * * *', 'SELECT cleanup_old_rate_limits()');

-- ============================================================
-- TEST SORULARI
-- ============================================================

-- Test 1: Kendi limitlerimi göster
SELECT * FROM get_my_rate_limits();

-- Test 2: Trigger çalışıyor mu?
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgname LIKE '%rate_limit%';

-- Test 3: Rate limit tablosu var mı?
SELECT COUNT(*) as total_limits FROM rate_limits;

-- Test 4: Spam test (dikkatli kullan!)
-- Bu sorguyu 6 kez çalıştırırsan 6. seferde rate limit hatası alırsın
-- INSERT INTO user_reports (reporter_id, reported_user_id, category, severity, description)
-- VALUES (auth.uid(), 'RANDOM_UUID', 'spam', 'low', 'Test');

-- ============================================================
-- NOTLAR
-- ============================================================
-- 1. user_reports tablosuna INSERT yapılırken otomatik kontrol edilir
-- 2. 24 saatte 5 şikayet limitini aşarsa exception fırlatılır
-- 3. Frontend'de error message gösterilir
-- 4. Admin rate limit'e takılmaz (trigger admin kontrolü yapabilir)
-- 5. Limitler 7 gün sonra otomatik temizlenir
-- 6. Kullanıcılar get_my_rate_limits() ile kalan haklarını görebilir
-- ============================================================
