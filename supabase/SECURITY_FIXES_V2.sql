-- =============================================================================
-- SUPABASE GÜVENLİK VE PERFORMANS DÜZELTMELERİ V2 (SYNTAX HATASI DÜZELTİLDİ)
-- =============================================================================
-- Tarih: 2024-12-10
-- Amaç: 8 kritik RLS hatası + 60+ performans sorunu düzeltmesi
-- Not: PostgreSQL'de DROP POLICY IF EXISTS sonrasında FOR kullanılmaz!
-- =============================================================================

-- =============================================================================
-- BÖLÜM 1: KRİTİK GÜVENLİK HATALARI (RLS EKSİK TABLOLAR)
-- =============================================================================

-- 1.1 user_rewards tablosuna RLS ekleme
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_rewards" ON public.user_rewards;
CREATE POLICY "users_view_own_rewards" ON public.user_rewards FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "admins_manage_rewards" ON public.user_rewards;
CREATE POLICY "admins_manage_rewards" ON public.user_rewards FOR ALL
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
);

-- 1.2 audit_logs tablosuna RLS ekleme
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_view_all_audits" ON public.audit_logs;
CREATE POLICY "admins_view_all_audits" ON public.audit_logs FOR SELECT
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
);

-- 1.3 level_badges tablosuna RLS ekleme
ALTER TABLE public.level_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_badges_new" ON public.level_badges;
CREATE POLICY "users_view_own_badges_new" ON public.level_badges FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "public_view_all_badges_new" ON public.level_badges;
CREATE POLICY "public_view_all_badges_new" ON public.level_badges FOR SELECT
USING (true);

-- 1.4 suggestions tablosuna RLS ekleme
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_suggestions" ON public.suggestions;
CREATE POLICY "users_insert_suggestions" ON public.suggestions FOR INSERT
WITH CHECK ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS "users_view_own_suggestions" ON public.suggestions;
CREATE POLICY "users_view_own_suggestions" ON public.suggestions FOR SELECT
USING ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS "admins_manage_suggestions" ON public.suggestions;
CREATE POLICY "admins_manage_suggestions" ON public.suggestions FOR ALL
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
);

-- 1.5 subscriptions tablosuna RLS ekleme
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_subscription" ON public.subscriptions;
CREATE POLICY "users_view_own_subscription" ON public.subscriptions FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "users_update_own_subscription" ON public.subscriptions;
CREATE POLICY "users_update_own_subscription" ON public.subscriptions FOR UPDATE
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "admins_manage_subscriptions" ON public.subscriptions;
CREATE POLICY "admins_manage_subscriptions" ON public.subscriptions FOR ALL
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
);

-- 1.6 user_reports tablosuna RLS ekleme
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_reports" ON public.user_reports;
CREATE POLICY "users_insert_reports" ON public.user_reports FOR INSERT
WITH CHECK ((SELECT auth.uid()) = reporter_user_id);

DROP POLICY IF EXISTS "users_view_own_reports" ON public.user_reports;
CREATE POLICY "users_view_own_reports" ON public.user_reports FOR SELECT
USING ((SELECT auth.uid()) = reporter_user_id OR (SELECT auth.uid()) = reported_user_id);

DROP POLICY IF EXISTS "admins_manage_reports" ON public.user_reports;
CREATE POLICY "admins_manage_reports" ON public.user_reports FOR ALL
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
);

-- 1.7 indoor_suggestions tablosuna RLS ekleme
ALTER TABLE public.indoor_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_insert_indoor_suggestions" ON public.indoor_suggestions;
CREATE POLICY "users_insert_indoor_suggestions" ON public.indoor_suggestions FOR INSERT
WITH CHECK ((SELECT auth.uid()) = submitted_by);

DROP POLICY IF EXISTS "users_view_own_indoor_suggestions" ON public.indoor_suggestions;
CREATE POLICY "users_view_own_indoor_suggestions" ON public.indoor_suggestions FOR SELECT
USING ((SELECT auth.uid()) = submitted_by);

DROP POLICY IF EXISTS "admins_manage_indoor_suggestions" ON public.indoor_suggestions;
CREATE POLICY "admins_manage_indoor_suggestions" ON public.indoor_suggestions FOR ALL
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
);

-- 1.8 group_quests tablosuna RLS ekleme
ALTER TABLE public.group_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_members_view_quests" ON public.group_quests;
CREATE POLICY "group_members_view_quests" ON public.group_quests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_quests.group_id
    AND user_id = (SELECT id FROM public.profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "admins_manage_quests" ON public.group_quests;
CREATE POLICY "admins_manage_quests" ON public.group_quests FOR ALL
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'ejderha112@gmail.com'
);

-- =============================================================================
-- BÖLÜM 2: GEREKSIZ TABLOLARI SİLME
-- =============================================================================

-- 2.1 Boş ve gereksiz "public" tablosunu silme
DROP TABLE IF EXISTS public.public CASCADE;

-- 2.2 Gereksiz "types/Task.ts" tablosunu silme
DROP TABLE IF EXISTS public."types/Task.ts" CASCADE;

-- =============================================================================
-- BÖLÜM 3: FOREIGN KEY İNDEXLERİ EKLEME (PERFORMANS)
-- =============================================================================

-- 3.1 badges tablosu
CREATE INDEX IF NOT EXISTS idx_badges_user_id ON public.badges(user_id);

-- 3.2 friends tablosu
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_id_new ON public.friends(user_id);

-- 3.3 gender_change_log tablosu
CREATE INDEX IF NOT EXISTS idx_gender_change_log_user_id ON public.gender_change_log(user_id);

-- 3.4 group_members tablosu
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);

-- 3.5 group_messages tablosu
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON public.group_messages(sender_id);

-- 3.6 groups tablosu
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

-- 3.7 indoor_suggestions tablosu
CREATE INDEX IF NOT EXISTS idx_indoor_suggestions_submitted_by ON public.indoor_suggestions(submitted_by);

-- 3.8 level_badges tablosu
CREATE INDEX IF NOT EXISTS idx_level_badges_user_id ON public.level_badges(user_id);

-- 3.9 locations tablosu
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON public.locations(user_id);

-- 3.10 moderation_actions tablosu
CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator_id ON public.moderation_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_id ON public.moderation_actions(report_id);

-- 3.11 radar_logs tablosu
CREATE INDEX IF NOT EXISTS idx_radar_logs_user_id ON public.radar_logs(user_id);

-- 3.12 room_photos tablosu
CREATE INDEX IF NOT EXISTS idx_room_photos_approved_by ON public.room_photos(approved_by);
CREATE INDEX IF NOT EXISTS idx_room_photos_room_id ON public.room_photos(room_id);
CREATE INDEX IF NOT EXISTS idx_room_photos_user_id_new ON public.room_photos(user_id);

-- 3.13 suggestions tablosu
CREATE INDEX IF NOT EXISTS idx_suggestions_created_by ON public.suggestions(created_by);

-- 3.14 supporter_dislikes tablosu
CREATE INDEX IF NOT EXISTS idx_supporter_dislikes_from_user_id ON public.supporter_dislikes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_supporter_dislikes_target_user_id ON public.supporter_dislikes(target_user_id);

-- 3.15 supporter_likes tablosu
CREATE INDEX IF NOT EXISTS idx_supporter_likes_from_user_id ON public.supporter_likes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_supporter_likes_target_user_id ON public.supporter_likes(target_user_id);

-- 3.16 user_reports tablosu
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user_id ON public.user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_user_id ON public.user_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reviewed_by ON public.user_reports(reviewed_by);

-- 3.17 user_rewards tablosu
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON public.user_rewards(user_id);

-- 3.18 supporters tablosu
CREATE INDEX IF NOT EXISTS idx_supporters_user_id_new ON public.supporters(user_id);

-- 3.19 subscriptions tablosu
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_new ON public.subscriptions(user_id);

-- 3.20 sessions tablosu
CREATE INDEX IF NOT EXISTS idx_sessions_user_id_new ON public.sessions(user_id);

-- =============================================================================
-- BÖLÜM 4: BAŞARI MESAJLARI
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Güvenlik ve Performans Düzeltmeleri Tamamlandı!';
  RAISE NOTICE '✅ 8 tabloya RLS politikası eklendi';
  RAISE NOTICE '✅ 2 gereksiz tablo silindi';
  RAISE NOTICE '✅ 22 foreign key indexi eklendi';
  RAISE NOTICE '🚀 Sistem şimdi daha güvenli ve hızlı!';
END $$;
