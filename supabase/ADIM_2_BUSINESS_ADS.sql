-- =====================================================
-- ✅ ADIM 2: BU DOSYAYI ÇALIŞTIR
-- =====================================================
-- Supabase Dashboard > SQL Editor > Paste > RUN
-- =====================================================

-- Bu dosya BUSINESS_AD_PLATFORM.sql dosyasının içeriğidir
-- İşletme reklam platformunu kurar:
-- - İşletme profilleri
-- - Video reklamlar (YouTube/Instagram/Facebook)
-- - Tıklama başına ücretlendirme
-- - Admin onay sistemi
-- =====================================================

-- NOT: Bu dosya zaten oluşturuldu.
-- supabase/BUSINESS_AD_PLATFORM.sql dosyasını kullan!

-- Kurulum sonrası kontrol:
SELECT 
  'business_profiles' as tablo, 
  COUNT(*) as mevcut_mu,
  'Isletme profilleri' as aciklama
FROM information_schema.tables 
WHERE table_name = 'business_profiles'
UNION ALL
SELECT 
  'business_ads' as tablo, 
  COUNT(*) as mevcut_mu,
  'Video reklamlar' as aciklama
FROM information_schema.tables 
WHERE table_name = 'business_ads'
UNION ALL
SELECT 
  'ad_interactions' as tablo, 
  COUNT(*) as mevcut_mu,
  'Goruntulenme/tiklamalar' as aciklama
FROM information_schema.tables 
WHERE table_name = 'ad_interactions';

-- Her satırda mevcut_mu = 1 görmelisin
-- 0 görürsen BUSINESS_AD_PLATFORM.sql'i çalıştırmadın demektir
