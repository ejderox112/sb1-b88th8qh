-- TÜM ESKİ TABLOLARI SİL (PART1'den önce çalıştır)
DROP TABLE IF EXISTS content_reports CASCADE;
DROP TABLE IF EXISTS indoor_photos CASCADE;
DROP TABLE IF EXISTS ad_interactions CASCADE;
DROP TABLE IF EXISTS business_ads CASCADE;
DROP TABLE IF EXISTS business_profiles CASCADE;
DROP TABLE IF EXISTS military_ranks CASCADE;
DROP TABLE IF EXISTS subscription_transactions CASCADE;
DROP TABLE IF EXISTS xp_sources CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS building_corners CASCADE;
DROP TABLE IF EXISTS venue_suggestions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- Type'ları da sil
DROP TYPE IF EXISTS military_rank_enum CASCADE;
DROP TYPE IF EXISTS subscription_tier_enum CASCADE;

SELECT 'Tüm eski tablolar silindi! Şimdi PART1 çalıştır.' AS status;
