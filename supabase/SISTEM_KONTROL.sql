-- =====================================================
-- ✅ BONUS: TÜM SİSTEM KONTROL SORGUSU
-- =====================================================
-- Herşeyin doğru kurulduğunu kontrol et
-- =====================================================

-- 1. TABLO KONTROLÜ
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'chat_media_limits', 'user_visibility_limits', 'ad_watches',
      'business_profiles', 'business_ads', 'ad_interactions',
      'user_ad_stats', 'ad_payments', 'ad_review_queue',
      'compression_stats'
    ) THEN '✅ KURULMUŞ'
    ELSE '❌ EKSİK'
  END as durum
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'chat_media_limits', 
    'user_visibility_limits', 
    'ad_watches',
    'user_ad_stats',
    'business_profiles', 
    'business_ads', 
    'ad_interactions',
    'ad_payments',
    'ad_review_queue',
    'compression_stats'
  )
ORDER BY table_name;

-- 2. FONKSİYON KONTROLÜ
SELECT 
  routine_name as fonksiyon_adi,
  '✅ Mevcut' as durum
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'watch_ad_for_extra_photos',
    'watch_ad_for_user_visibility',
    'share_location_in_chat',
    'get_nearby_ads',
    'record_ad_impression',
    'record_ad_click',
    'admin_approve_ad'
  )
ORDER BY routine_name;

-- 3. VIEW KONTROLÜ
SELECT 
  table_name as view_adi,
  '✅ Mevcut' as durum
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'nearby_friends_3d',
    'user_chat_media_stats',
    'user_visibility_stats',
    'business_ad_stats',
    'admin_ad_review_dashboard',
    'platform_revenue_report',
    'compression_performance'
  )
ORDER BY table_name;

-- 4. SAYISAL ÖZET
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('chat_media_limits', 'user_visibility_limits', 'ad_watches', 
                      'business_profiles', 'business_ads', 'ad_interactions',
                      'user_ad_stats', 'ad_payments', 'ad_review_queue', 'compression_stats')
  ) as toplam_tablo,
  
  (SELECT COUNT(*) FROM information_schema.routines 
   WHERE routine_schema = 'public'
   AND routine_name IN ('watch_ad_for_extra_photos', 'watch_ad_for_user_visibility',
                        'share_location_in_chat', 'get_nearby_ads', 'record_ad_impression',
                        'record_ad_click', 'admin_approve_ad')
  ) as toplam_fonksiyon,
  
  (SELECT COUNT(*) FROM information_schema.views 
   WHERE table_schema = 'public'
   AND table_name IN ('nearby_friends_3d', 'user_chat_media_stats', 'user_visibility_stats',
                      'business_ad_stats', 'admin_ad_review_dashboard', 'platform_revenue_report',
                      'compression_performance')
  ) as toplam_view;

-- BEKLENİLEN SONUÇLAR:
-- toplam_tablo: 10
-- toplam_fonksiyon: 7
-- toplam_view: 7
--
-- Eksik varsa ilgili SQL dosyasını tekrar çalıştır!
