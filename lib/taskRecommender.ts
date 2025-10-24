import { isWithinRadius } from './proximityUtils';

export function recommendTasks(user, tasks) {
  const radius = user.level >= 40 ? 500 : 100;
  const now = new Date();

  return tasks.filter(task =>
    task.active &&
    new Date(task.expires_at) > now &&
    task.min_level <= user.level &&
    isWithinRadius(user.lat, user.lng, task.lat, task.lng, radius) &&
    task.tags.some(tag => user.interest_tags.includes(tag))
  );
}