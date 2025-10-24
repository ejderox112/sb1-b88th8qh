// mediaLimits.ts
// Görev 47–50: JPG/ses gönderim sınırları + seviye kontrolü + arkadaşlık gerekliliği

type MediaType = 'jpg' | 'audio';

export function getDailyLimit(level: number, type: MediaType): number {
  if (type === 'jpg') {
    if (level < 10) return 3;
    if (level < 30) return 10;
    return 20;
  }

  if (type === 'audio') {
    return 10; // sabit limit
  }

  return 0;
}

export function getMaxFileSize(level: number, type: MediaType): number {
  if (type === 'jpg') {
    if (level < 10) return 1 * 1024 * 1024; // 1MB
    if (level < 30) return 3 * 1024 * 1024; // 3MB
    return 5 * 1024 * 1024; // 5MB
  }

  if (type === 'audio') {
    return 60 * 1000; // 60 saniye
  }

  return 0;
}

export function canSendMedia(senderId: string, receiverId: string, friends: [string, string][]): boolean {
  // Sadece arkadaş olan kullanıcılar birbirine medya gönderebilir
  return friends.some(
    ([a, b]) =>
      (a === senderId && b === receiverId) ||
      (a === receiverId && b === senderId)
  );
}