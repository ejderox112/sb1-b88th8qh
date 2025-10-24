// taskRules.ts
// Görev 56: Görev tamamlama, XP dağıtımı ve teslim kontrolü

type TaskStatus = 'pending' | 'completed' | 'rejected';

export function isTaskCompleted(status: TaskStatus): boolean {
  return status === 'completed';
}

export function getXPForCompletion(baseXP: number, status: TaskStatus): number {
  if (status === 'completed') return baseXP;
  if (status === 'rejected') return -Math.floor(baseXP / 2); // Ceza
  return 0;
}

export function canSubmitTask(status: TaskStatus): boolean {
  return status === 'pending';
}