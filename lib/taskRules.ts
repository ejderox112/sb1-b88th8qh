export function isValidTaskTitle(title: string): boolean {
  return title.length >= 5 && title.length <= 100;
}

export function isValidXP(xp: number): boolean {
  return xp > 0 && xp <= 500;
}

export function isTaskCompleted(status: string): boolean {
  return status === 'completed';
}