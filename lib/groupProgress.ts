export function calculateGroupLevel(totalXp) {
  return Math.floor(Math.sqrt(totalXp / 100)); // Örn: 10000 XP → seviye 10
}

export function checkForChestUnlock(prevLevel, newLevel) {
  return newLevel > prevLevel;
}