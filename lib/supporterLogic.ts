import { supabase } from './supabase';
import { UserProfile } from '@/types/userModels';

export type SupporterInfo = {
  userId: string;
  amount: number;
  date: string;
  projectId?: string;
};

export async function getTopSupporters(projectId?: string, limit = 3): Promise<SupporterInfo[]> {
  let query = supabase.from('supporters').select('*');
  if (projectId) query = query.eq('project_id', projectId);
  query = query.order('amount', { ascending: false }).limit(limit);
  const { data, error } = await query;
  if (error) return [];
  return data as SupporterInfo[];
}

export async function addSupporter(userId: string, amount: number, projectId?: string) {
  const { error } = await supabase.from('supporters').insert({ user_id: userId, amount, date: new Date().toISOString(), project_id: projectId });
  return !error;
}

export async function getSupporterBadges(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('supporter_badges').select('badge').eq('user_id', userId);
  if (error || !data) return [];
  return data.map((row: any) => row.badge);
}

export async function likeSupporter(targetUserId: string, fromUserId: string) {
  const { error } = await supabase.from('supporter_likes').upsert({ target_user_id: targetUserId, from_user_id: fromUserId });
  return !error;
}

export async function dislikeSupporter(targetUserId: string, fromUserId: string) {
  const { error } = await supabase.from('supporter_dislikes').upsert({ target_user_id: targetUserId, from_user_id: fromUserId });
  return !error;
}
