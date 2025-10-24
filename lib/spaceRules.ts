// spaceRules.ts
// Görev 50: Mekân tanımı + erişim seviyesi + içerik görünürlüğü + görev sınırları

type Space = {
  id: string;
  name: string;
  type: 'hastane' | 'okul' | 'alışveriş' | 'kafe' | 'diğer';
  minLevel: number;
  maxTasks: number;
  isPublic: boolean;
};

type User = {
  id: string;
  level: number;
};

export function canAccessSpace(user: User, space: Space): boolean {
  return user.level >= space.minLevel;
}

export function getVisibleContent(space: Space, user: User): 'tam' | 'kısıtlı' | 'gizli' {
  if (!space.isPublic && user.level < space.minLevel) return 'gizli';
  if (user.level < space.minLevel + 5) return 'kısıtlı';
  return 'tam';
}

export function getTaskLimit(space: Space): number {
  return space.maxTasks;
}

export function getSpaceLabel(space: Space): string {
  switch (space.type) {
    case 'hastane':
      return '🏥 Sağlık Alanı';
    case 'okul':
      return '🏫 Eğitim Alanı';
    case 'alışveriş':
      return '🛍️ Ticaret Alanı';
    case 'kafe':
      return '☕ Sosyal Alan';
    default:
      return '📍 Genel Alan';
  }
}