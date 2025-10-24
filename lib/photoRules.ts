// photoRules.ts
// Görev 55: Fotoğraf hash kontrolü, spam önleme ve onay durumu

const APPROVAL_REQUIRED = true;

export function generatePhotoHash(photoUrl: string): string {
  // Basit hash üretimi (gerçek projede daha güvenli algoritma gerekir)
  return btoa(photoUrl).slice(0, 12);
}

export function isDuplicatePhoto(newHash: string, existingHashes: string[]): boolean {
  return existingHashes.includes(newHash);
}

export function requiresPhotoApproval(): boolean {
  return APPROVAL_REQUIRED;
}