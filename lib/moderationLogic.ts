import { supabase } from './supabase';
import { UserReport, ModerationAction } from '@/types/moderationModels';

// Kullanıcı raporu ekle
export async function addUserReport(reported_user_id: string, reporter_user_id: string, reason: string, details?: string) {
  return await supabase.from('user_reports').insert({
    reported_user_id,
    reporter_user_id,
    reason,
    details,
  });
}

// Raporları listele (admin/moderator için)
export async function getUserReports(status: string = 'pending') {
  return await supabase.from('user_reports').select('*').eq('status', status).order('created_at', { ascending: false });
}

// Moderasyon aksiyonu ekle
export async function addModerationAction(report_id: string, moderator_id: string, action: string, notes?: string) {
  return await supabase.from('moderation_actions').insert({
    report_id,
    moderator_id,
    action,
    notes,
  });
}

// Raporu güncelle (admin/moderator onayı)
export async function reviewUserReport(report_id: string, status: string, reviewed_by: string) {
  return await supabase.from('user_reports').update({
    status,
    reviewed_by,
    reviewed_at: new Date().toISOString(),
  }).eq('id', report_id);
}
