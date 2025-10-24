// badgeRules.ts
// Görev 50: Mekân türüne göre rozet eşlemesi + XP mantığı

type SpaceType = 'hospital' | 'school' | 'mall' | 'cafe' | 'other';

export function getBadgeForSpace(type: SpaceType): string {
  switch (type) {
    case 'hospital':
      return '🩺 Sağlık Kahramanı';
    case 'school':
      return '📚 Bilgi Avcısı';
    case 'mall':
      return '🛍️ Keşif Uzmanı';
    case 'cafe':
      return '☕ Sosyal Gezgin';
    default:
      return '🌍 Genel Katılımcı';
  }
}

export function getXPForTask(type: SpaceType): number {
  switch (type) {
    case 'hospital':
      return 30;
    case 'school':
      return 25;
    case 'mall':
      return 20;
    case 'cafe':
      return 15;
    default:
      return 10;
  }
}