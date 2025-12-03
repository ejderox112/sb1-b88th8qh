import { supabase } from './supabase';

// Belirli bir proje için en çok bağış yapan ilk 3 kullanıcıyı döndür
export async function getTopSupporters(project_id: string) {
  const { data, error } = await supabase
    .from('supporters')
    .select('user_id, amount')
    .eq('project_id', project_id)
    .order('amount', { ascending: false })
    .limit(3);
  return { data, error };
}

// getTopSupporters ile birlikte kullanıcı profillerini de döndürür
export async function getTopSupportersWithProfile(project_id: string) {
  const top = await getTopSupporters(project_id);
  if (top.error) return { data: null, error: top.error };

  const supporters = top.data || [];
  const userIds = supporters.map((s: any) => s.user_id).filter(Boolean);
  if (userIds.length === 0) return { data: [], error: null };

  const { data: profiles, error: profilesErr } = await supabase
    .from('user_profiles')
    .select('id, nickname, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  const merged = supporters.map((s: any) => {
    const p = profileMap.get(s.user_id) || {};
    return {
      ...s,
      nickname: p.nickname || null,
      avatar_url: p.avatar_url || null,
    };
  });

  return { data: merged, error: profilesErr || null };
}
