-- =============================================================================
-- OTOMATIK RESIM SIKISTIRMA VE BOYUTLANDIRMA SISTEMI
-- =============================================================================
-- Kullanici resim yuklediginde otomatik olarak:
-- 1. Boyut kucultme (avatar 400x400, foto 1200x1200)
-- 2. WebP formatina cevirme (70-80% yer tasarrufu)
-- 3. Kalite optimizasyonu
-- 4. Orijinal dosyayi silme (opsiyonel)
-- =============================================================================

-- ============================================================
-- 1. STORAGE BUCKET POLICY (COMPRESSED KLASORU)
-- ============================================================

-- Supabase Storage'da "compressed" klasoru icin policy
-- Dashboard > Storage > Policies

-- Public erisim (compressed resimler herkes gorebilir)
CREATE POLICY "Public access to compressed images"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND name LIKE 'compressed/%');

CREATE POLICY "Public access to compressed task photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-photos' AND name LIKE 'compressed/%');

CREATE POLICY "Public access to compressed venue photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'venue-photos' AND name LIKE 'compressed/%');

-- ============================================================
-- 2. FILE_UPLOADS TABLOSU GUNCELLEME
-- ============================================================

-- Metadata kolonu zaten var, ama ek alan ekleyelim
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS original_size BIGINT;
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS compressed_size BIGINT;
ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS compression_ratio NUMERIC(5,2);

-- Index ekle (performans icin)
CREATE INDEX IF NOT EXISTS idx_file_uploads_compression ON file_uploads(compression_ratio);

-- ============================================================
-- 3. OTOMATIK SIKISTIRMA TRIGGER
-- ============================================================

-- Trigger fonksiyonu: Dosya yuklendikinde Edge Function'i tetikle
CREATE OR REPLACE FUNCTION trigger_image_compression()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  -- Sadece resim dosyalari icin
  IF NEW.file_type LIKE 'image/%' THEN
    -- Edge Function URL'i (Supabase projenize gore duzenleyin)
    webhook_url := 'https://cwbwxidnarcklxtsxtkf.supabase.co/functions/v1/image-optimizer';
    
    -- HTTP POST istegi gonder (pg_net extension gerekli)
    PERFORM
      net.http_post(
        url := webhook_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'sub'
        ),
        body := jsonb_build_object(
          'file_id', NEW.id,
          'file_name', NEW.file_name,
          'file_hash', NEW.file_hash,
          'upload_type', NEW.upload_type
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger olustur
DROP TRIGGER IF EXISTS on_file_upload_compress ON file_uploads;
CREATE TRIGGER on_file_upload_compress
  AFTER INSERT ON file_uploads
  FOR EACH ROW
  WHEN (NEW.file_type LIKE 'image/%')
  EXECUTE FUNCTION trigger_image_compression();

-- ============================================================
-- 4. MANUEL SIKISTIRMA FONKSIYONU (TOPLU ISLEM)
-- ============================================================

-- Mevcut tum resimleri toplu sikistir
CREATE OR REPLACE FUNCTION compress_existing_images()
RETURNS TABLE(processed INT, total_saved BIGINT) AS $$
DECLARE
  image_record RECORD;
  processed_count INT := 0;
  total_savings BIGINT := 0;
BEGIN
  FOR image_record IN 
    SELECT * FROM file_uploads 
    WHERE file_type LIKE 'image/%' 
      AND (compressed_size IS NULL OR compressed_size = 0)
    LIMIT 100 -- Batch islem (100 resim)
  LOOP
    -- Edge Function'i tetikle
    PERFORM trigger_image_compression();
    processed_count := processed_count + 1;
  END LOOP;
  
  -- Toplam tasarruf hesapla
  SELECT 
    COUNT(*),
    SUM(file_size - compressed_size)
  INTO processed, total_saved
  FROM file_uploads
  WHERE compressed_size > 0;
  
  RETURN QUERY SELECT processed, total_saved;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. SIKISTIRMA ISTATISTIKLERI VIEW
-- ============================================================

CREATE OR REPLACE VIEW compression_stats AS
SELECT 
  upload_type,
  COUNT(*) as total_files,
  SUM(original_size) as total_original_size,
  SUM(compressed_size) as total_compressed_size,
  SUM(original_size - compressed_size) as total_saved,
  AVG(compression_ratio) as avg_compression_ratio,
  (SUM(original_size - compressed_size) * 100.0 / NULLIF(SUM(original_size), 0)) as total_savings_percent
FROM file_uploads
WHERE compressed_size > 0
GROUP BY upload_type;

GRANT SELECT ON compression_stats TO authenticated;

-- ============================================================
-- 6. ADMIN SIKISTIRMA PANELI VIEW
-- ============================================================

CREATE OR REPLACE VIEW admin_compression_dashboard AS
SELECT 
  DATE(created_at) as date,
  upload_type,
  COUNT(*) as uploads_count,
  SUM(original_size) / 1024 / 1024 as original_mb,
  SUM(compressed_size) / 1024 / 1024 as compressed_mb,
  SUM(original_size - compressed_size) / 1024 / 1024 as saved_mb,
  AVG(compression_ratio) as avg_compression
FROM file_uploads
WHERE compressed_size > 0
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), upload_type
ORDER BY date DESC;

GRANT SELECT ON admin_compression_dashboard TO authenticated;

-- ============================================================
-- 7. KULLANIM ORNEĞI
-- ============================================================

-- Mevcut resimleri toplu sikistir
-- SELECT * FROM compress_existing_images();

-- Sikistirma istatistiklerini gor
-- SELECT * FROM compression_stats;

-- Admin dashboard
-- SELECT * FROM admin_compression_dashboard;

-- Belirli bir dosyanin sikistirma bilgisi
-- SELECT 
--   file_name,
--   original_size / 1024 as original_kb,
--   compressed_size / 1024 as compressed_kb,
--   compression_ratio || '%' as saved,
--   (original_size - compressed_size) / 1024 as saved_kb
-- FROM file_uploads
-- WHERE id = 'dosya-id';

-- ============================================================
-- BASARI MESAJI
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE ' OTOMATIK RESIM SIKISTIRMA SISTEMI KURULDU!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Ozellikler:';
  RAISE NOTICE '  - Avatar: 400x400, WebP, 80%% kalite';
  RAISE NOTICE '  - Task Photo: 1200x1200, WebP, 75%% kalite';
  RAISE NOTICE '  - Venue Photo: 1600x1600, WebP, 80%% kalite';
  RAISE NOTICE '  - Blueprint: 2000x2000, WebP, 85%% kalite (orijinal saklanir)';
  RAISE NOTICE '';
  RAISE NOTICE 'Beklenen yer tasarrufu:';
  RAISE NOTICE '  - JPEG/PNG -> WebP: 70-80%% daha kucuk';
  RAISE NOTICE '  - Boyutlandirma: 50-90%% daha kucuk';
  RAISE NOTICE '  - Toplam tasarruf: 80-95%%';
  RAISE NOTICE '';
  RAISE NOTICE 'Ornek:';
  RAISE NOTICE '  - Orijinal: 5MB JPEG foto';
  RAISE NOTICE '  - Sikistirilmis: 250KB WebP foto';
  RAISE NOTICE '  - Tasarruf: 95%% (4.75MB)';
  RAISE NOTICE '';
  RAISE NOTICE 'SONRAKI ADIM:';
  RAISE NOTICE '  1. Edge Function deploy et: npx supabase functions deploy image-optimizer';
  RAISE NOTICE '  2. pg_net extension aktif et (Dashboard > Database > Extensions)';
  RAISE NOTICE '  3. Mevcut resimleri sikistir: SELECT * FROM compress_existing_images();';
  RAISE NOTICE '============================================';
END $$;
