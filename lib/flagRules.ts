// flagRules.ts
// Görev 52: İçerik şikayet sistemi ve kötüye kullanım kontrolü

type ContentType = 'photo' | 'task' | 'comment';

const FLAG_THRESHOLD: Record<ContentType, number> = {
  photo: 3,
  task: 5,
  comment: 2,
};

export function isFlaggedEnough(type: ContentType, flagCount: number): boolean {
  const threshold = FLAG_THRESHOLD[type] ?? 3;
  return flagCount >= threshold;
}

export function getFlagReason(type: ContentType): string {
  switch (type) {
    case 'photo':
      return 'Uygunsuz görsel';
    case 'task':
      return 'Spam görev';
    case 'comment':
      return 'Hakaret veya kötü dil';
    default:
      return 'Şikayet edildi';
  }
}