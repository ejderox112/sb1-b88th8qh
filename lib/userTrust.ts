// userTrust.ts
// Görev 50: Kullanıcı güven puanı + şikayet limiti + içerik önerme yetkisi

type TrustProfile = {
  userId: string;
  trustScore: number; // 0–100 arası
  complaintCount: number;
  level: number;
};

export function canSuggestContent(profile: TrustProfile): boolean {
  // Güven puanı 60+ ve seviye 10+ ise öneri yapılabilir
  return profile.trustScore >= 60 && profile.level >= 10;
}

export function canModerate(profile: TrustProfile): boolean {
  // Güven puanı 80+ ve seviye 20+ ise moderasyon önerisi yapılabilir
  return profile.trustScore >= 80 && profile.level >= 20;
}

export function isFlagged(profile: TrustProfile): boolean {
  // Şikayet sayısı 5+ ise kullanıcı sistemsel olarak işaretlenir
  return profile.complaintCount >= 5;
}

export function getTrustLabel(score: number): string {
  if (score < 30) return '⚠️ Düşük Güven';
  if (score < 60) return '🟡 Orta Güven';
  if (score < 80) return '🟢 Güvenilir';
  return '🔵 Elit Güven';
}