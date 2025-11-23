import { supabase } from './supabase';

// Kullanıcının destekçi rozetlerini getir
export async function getSupporterBadges(user_id: string) {
  const { data, error } = await supabase
    .from('supporter_badges')
    .select('badge, project_id, awarded_at')
    .eq('user_id', user_id)
    .order('awarded_at', { ascending: false });
  return { data, error };
}
