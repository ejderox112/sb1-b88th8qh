export function calculateLevel(totalXp: number): number {
  let level = 1;
  let requiredXp = 15;

  while (totalXp >= requiredXp && level < 80) {
    level++;
    requiredXp = Math.floor(requiredXp * 1.2);
  }

  return level;
}