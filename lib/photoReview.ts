// photoReview.ts
// Görev 50: Fotoğraf yükleme + manuel onay + içerik filtreleme + XP ödülü

type Photo = {
  id: string;
  uploaderId: string;
  hash: string;
  approved: boolean;
  flagged: boolean;
  uploadedAt: string;
};

export function needsManualReview(photo: Photo): boolean {
  return !photo.approved || photo.flagged;
}

export function isDuplicatePhoto(photo: Photo, recentHashes: string[]): boolean {
  return recentHashes.includes(photo.hash);
}

export function getXpForPhotoUpload(photo: Photo): number {
  if (!photo.approved || photo.flagged) return 0;
  return 15;
}

export function getPhotoStatusLabel(photo: Photo): string {
  if (photo.flagged) return '🚫 İşaretlendi';
  if (!photo.approved) return '⏳ İncelemede';
  return '✅ Onaylandı';
}