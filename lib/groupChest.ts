// groupChest.ts
// Görev 49: Grup seviyesiyle açılan sandıklar + ödül tetikleme + rozet mantığı

export function calculateGroupLevel(taskCount: number, badgeCount: number): number {
  // Grup seviyesi görev ve rozet sayısına göre hesaplanır
  const base = taskCount + badgeCount * 2;
  return Math.floor(Math.sqrt(base));
}

export function checkChestUnlock(prevLevel: number, newLevel: number): boolean {
  // Seviye atlandıysa sandık açılır
  return newLevel > prevLevel;
}

export function getChestRewards(level: number): string[] {
  // Sandık ödülleri seviye bazlı belirlenir (XP vermez!)
  if (level < 5) return ['🎨 Avatar Parçası', '🎖️ Grup Rozeti'];
  if (level < 10) return ['🎨 Avatar Parçası', '🎖️ Grup Rozeti', '🎉 Etkileşim Efekti'];
  return ['🎨 Avatar Parçası', '🎖️ Grup Rozeti', '🎉 Efekt', '🧬 Sosyal Etki Puanı'];
}

export function getNextChestLevel(currentLevel: number): number {
  // Bir sonraki sandık seviyesi
  return currentLevel + 1;
}