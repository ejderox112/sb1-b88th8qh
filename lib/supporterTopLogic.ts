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
