export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 10));
}

export function xpForNextLevel(level: number): number {
  return Math.pow(level + 1, 2) * 10;
}

export function progressToNextLevel(xp: number): number {
  const currentLevel = calculateLevel(xp);
  const currentLevelXP = xpForNextLevel(currentLevel - 1);
  const nextLevelXP = xpForNextLevel(currentLevel);
  return Math.floor(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);
}