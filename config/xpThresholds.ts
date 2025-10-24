export const XP_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 7000, 10000];

export function getLevelFromXP(xp: number): number {
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) return i;
  }
  return 0;
}