// levelLogic.ts
// Görev 50: XP ile seviye hesaplama + ilerleme yüzdesi + seviye etiketi

export function getLevelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 10));
}

export function getXpForNextLevel(level: number): number {
  const nextLevel = level + 1;
  return nextLevel * nextLevel * 10;
}

export function getProgressPercent(xp: number): number {
  const level = getLevelFromXp(xp);
  const currentLevelXp = level * level * 10;
  const nextLevelXp = getXpForNextLevel(level);
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(100, Math.max(0, Math.floor(progress)));
}

export function getLevelLabel(level: number): string {
  if (level < 5) return '🟢 Başlangıç';
  if (level < 15) return '🔵 Gelişen';
  if (level < 30) return '🟣 Usta';
  return '🟠 Efsane';
}