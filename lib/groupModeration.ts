// groupModeration.ts
// Görev 48–50: Grup içi sessize alma, atma, yetki kontrolü

import { supabase } from './supabaseClient';

export async function isGroupModeratorOrLeader(groupId: string, userId: string): Promise<boolean> {
  const { data: group } = await supabase
    .from('user_groups')
    .select('admin_id')
    .eq('id', groupId)
    .single();

  const { data: mods } = await supabase
    .from('group_moderators')
    .select('user_id')
    .eq('group_id', groupId);

  const { data: leaders } = await supabase
    .from('group_leaders')
    .select('user_id')
    .eq('group_id', groupId);

  return (
    userId === group?.admin_id ||
    mods?.some(m => m.user_id === userId) ||
    leaders?.some(l => l.user_id === userId)
  );
}

export async function muteUser(groupId: string, targetUserId: string, byUserId: string): Promise<boolean> {
  const authorized = await isGroupModeratorOrLeader(groupId, byUserId);
  if (!authorized) return false;

  await supabase.from('group_mutes').insert({
    group_id: groupId,
    user_id: targetUserId,
    muted_by: byUserId,
    muted_at: new Date().toISOString(),
  });

  return true;
}

export async function unmuteUser(groupId: string, targetUserId: string, byUserId: string): Promise<boolean> {
  const authorized = await isGroupModeratorOrLeader(groupId, byUserId);
  if (!authorized) return false;

  await supabase
    .from('group_mutes')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', targetUserId);

  return true;
}

export async function kickUser(groupId: string, targetUserId: string, byUserId: string): Promise<boolean> {
  const authorized = await isGroupModeratorOrLeader(groupId, byUserId);
  if (!authorized) return false;

  await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', targetUserId);

  return true;
}

export async function isUserMuted(groupId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('group_mutes')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}