// flagRules.ts
// Görev 50: İçerik işaretleme kuralları + şikayet eşiği + sistemsel gizleme

type FlaggedContent = {
  id: string;
  type: 'photo' | 'task' | 'message';
  flagCount: number;
  createdAt: string;
};

export function isContentFlagged(content: FlaggedContent): boolean {
  return content.flagCount >= 3;
}

export function shouldAutoHide(content: FlaggedContent): boolean {
  // 5+ şikayet varsa sistemsel olarak gizlenir
  return content.flagCount >= 5;
}

export function getFlagLabel(type: FlaggedContent['type']): string {
  switch (type) {
    case 'photo':
      return '🚫 Fotoğraf Şikayeti';
    case 'task':
      return '⚠️ Görev Şikayeti';
    case 'message':
      return '💬 Mesaj Şikayeti';
    default:
      return '❗ İçerik Şikayeti';
  }
}