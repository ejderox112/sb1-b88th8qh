import { calculateLevel } from '../lib/levelUtils';
import { supabase } from '../lib/supabase';

export async function completeTask(taskId: string) {
  const user = await supabase.auth.getUser();
  const userId = user.data.user.id;

  const { data: task } = await supabase
    .from('tasks')
    .select('xp_value')
    .eq('id', taskId)
    .single();

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp, level')
    .eq('id', userId)
    .single();

  const newXp = profile.total_xp + task.xp_value;
  const newLevel = calculateLevel(newXp);

  await supabase.from('profiles').update({
    total_xp: newXp,
    level: newLevel,
  }).eq('id', userId);

  if (newLevel > profile.level) {
    await supabase.from('level_badges').insert({
      user_id: userId,
      level: newLevel,
      awarded_at: new Date().toISOString(),
    });

    if (newLevel === 80) {
      await supabase.from('user_rewards').insert({
        user_id: userId,
        reward_type: 'VIP Kupon',
        description: '80. seviye ayrıcalığı',
        granted_at: new Date().toISOString(),
      });
    }
  }
}