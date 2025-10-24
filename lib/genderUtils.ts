export function canChangeGender(lastChangeDate, changeCount) {
  const now = new Date();
  const diff = now.getTime() - new Date(lastChangeDate).getTime();
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;

  if (changeCount >= 3) return { allowed: false, reason: 'Admin onayı gerekli. XP cezası uygulanır.' };
  if (diff < twoWeeks) return { allowed: false, reason: '2 hafta dolmadan tekrar değiştirilemez.' };
  return { allowed: true };
}