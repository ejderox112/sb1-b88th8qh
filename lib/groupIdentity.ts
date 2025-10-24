// groupIdentity.ts
// Görev 49–50: Grup adı, rozet, seviye ve prestij göstergesi

type Group = {
  name: string;
  badgeCount: number;
  taskCount: number;
  createdAt: string;
};

export function getGroupLevel(group: Group): number {
  const base = group.taskCount + group.badgeCount * 2;
  return Math.floor(Math.sqrt(base));
}

export function getGroupPrestigeTitle(level: number): string {
  if (level < 3) return '🪶 Yeni Takım';
  if (level < 7) return '🔥 Aktif Grup';
  if (level < 12) return '🏆 Usta Takım';
  return '👑 Efsanevi Birlik';
}

export function getGroupAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diff = now.getTime() - created.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} gün`;
  const months = Math.floor(days / 30);
  return `${months} ay`;
}