// notificationRules.ts
// Görev 50: Bildirim tetikleme + sessize alma kontrolü + içerik türüne göre filtreleme

type NotificationType = 'message' | 'task' | 'badge' | 'system';

type UserSettings = {
  muted: boolean;
  blockedTypes: NotificationType[];
};

export function shouldNotify(userSettings: UserSettings, type: NotificationType): boolean {
  if (userSettings.muted) return false;
  if (userSettings.blockedTypes.includes(type)) return false;
  return true;
}

export function getNotificationLabel(type: NotificationType): string {
  switch (type) {
    case 'message':
      return '📩 Yeni Mesaj';
    case 'task':
      return '✅ Yeni Görev';
    case 'badge':
      return '🏅 Yeni Rozet';
    case 'system':
      return '⚙️ Sistem Bildirimi';
    default:
      return '🔔 Bildirim';
  }
}

export function getNotificationPriority(type: NotificationType): number {
  switch (type) {
    case 'message':
      return 3;
    case 'task':
      return 2;
    case 'badge':
      return 1;
    case 'system':
      return 0;
    default:
      return 0;
  }
}