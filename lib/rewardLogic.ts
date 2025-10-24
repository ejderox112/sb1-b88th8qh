// rewardLogic.ts
// Görev 50: Görev tamamlama + rozet kazanımı + XP dağıtımı

type Task = {
  id: string;
  difficulty: 'kolay' | 'orta' | 'zor';
  completedAt: string;
};

type Badge = {
  id: string;
  type: 'keşif' | 'yardım' | 'etkileşim';
  earnedAt: string;
};

export function calculateXpFromTask(task: Task): number {
  switch (task.difficulty) {
    case 'kolay':
      return 10;
    case 'orta':
      return 25;
    case 'zor':
      return 50;
    default:
      return 0;
  }
}

export function calculateXpFromBadge(badge: Badge): number {
  switch (badge.type) {
    case 'keşif':
      return 20;
    case 'yardım':
      return 30;
    case 'etkileşim':
      return 15;
    default:
      return 0;
  }
}

export function getTotalXp(tasks: Task[], badges: Badge[]): number {
  const taskXp = tasks.reduce((sum, t) => sum + calculateXpFromTask(t), 0);
  const badgeXp = badges.reduce((sum, b) => sum + calculateXpFromBadge(b), 0);
  return taskXp + badgeXp;
}