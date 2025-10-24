// xpEvents.ts
// Görev 50: XP kazandıran olaylar + tetikleyici türleri + zaman kontrolü

type XpEvent = {
  type: 'task_complete' | 'photo_upload' | 'message_sent' | 'badge_earned';
  timestamp: string;
};

export function getXpForEvent(event: XpEvent): number {
  switch (event.type) {
    case 'task_complete':
      return 20;
    case 'photo_upload':
      return 15;
    case 'message_sent':
      return 5;
    case 'badge_earned':
      return 25;
    default:
      return 0;
  }
}

export function isRecentEvent(event: XpEvent, seconds: number): boolean {
  const now = new Date().getTime();
  const eventTime = new Date(event.timestamp).getTime();
  return now - eventTime <= seconds * 1000;
}

export function getEventLabel(type: XpEvent['type']): string {
  switch (type) {
    case 'task_complete':
      return '✅ Görev Tamamlandı';
    case 'photo_upload':
      return '📸 Fotoğraf Yüklendi';
    case 'message_sent':
      return '💬 Mesaj Gönderildi';
    case 'badge_earned':
      return '🏅 Rozet Kazanıldı';
    default:
      return '🎯 Etkinlik';
  }
}