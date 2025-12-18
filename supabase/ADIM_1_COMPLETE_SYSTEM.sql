-- =====================================================
-- ✅ ADIM 1: BU DOSYAYI ÇALIŞTIR
-- =====================================================
-- Supabase Dashboard > SQL Editor > Paste > RUN
-- =====================================================

-- Bu dosya COMPLETE_FINAL_SYSTEM.sql dosyasının içeriğidir
-- Tüm sistemi tek seferde kurar:
-- - Chat konum paylaşımı
-- - Foto limitleri + reklam sistemi
-- - Kullanıcı görünürlük sistemi
-- - Image compression
-- =====================================================

-- NOT: Bu dosya zaten oluşturuldu.
-- supabase/COMPLETE_FINAL_SYSTEM.sql dosyasını kullan!

-- Kurulum sonrası kontrol:
SELECT 
  'chat_media_limits' as tablo, 
  COUNT(*) as mevcut_mu,
  'Foto limit sistemi' as aciklama
FROM information_schema.tables 
WHERE table_name = 'chat_media_limits'
UNION ALL
SELECT 
  'user_visibility_limits' as tablo, 
  COUNT(*) as mevcut_mu,
  'Kullanici gorunurluk sistemi' as aciklama
FROM information_schema.tables 
WHERE table_name = 'user_visibility_limits'
UNION ALL
SELECT 
  'ad_watches' as tablo, 
  COUNT(*) as mevcut_mu,
  'Reklam izleme sistemi' as aciklama
FROM information_schema.tables 
WHERE table_name = 'ad_watches';

-- Her satırda mevcut_mu = 1 görmelisin
-- 0 görürsen COMPLETE_FINAL_SYSTEM.sql'i çalıştırmadın demektir
