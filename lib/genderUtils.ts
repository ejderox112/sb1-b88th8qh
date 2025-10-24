// genderUtils.ts
// Görev 50: Cinsiyet değişim kontrolü + ceza + admin onayı

export function canChangeGender(lastChangeDate: string, changeCount: number) {
  const now = new Date();
  const lastChange = new Date(lastChangeDate);
  const diff = now.getTime() - lastChange.getTime();
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;

  if (changeCount >= 3) {
    return {
      allowed: false,
      reason: 'Cinsiyet 3 defadan fazla değiştirilemez. Admin onayı gereklidir. -200 XP cezası uygulanır.',
      requiresApproval: true,
      xpPenalty: 200,
    };
  }

  if (diff < twoWeeks) {
    return {
      allowed: false,
      reason: 'Son değişim üzerinden 2 hafta geçmeden tekrar değiştirilemez.',
      requiresApproval: false,
      xpPenalty: 0,
    };
  }

  return {
    allowed: true,
    reason: 'Değişim yapılabilir.',
    requiresApproval: false,
    xpPenalty: 0,
  };
}