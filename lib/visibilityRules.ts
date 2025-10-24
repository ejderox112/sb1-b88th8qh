// visibilityRules.ts
// Görev 54: Haritada görünürlük, gizlilik ve admin kontrolü

type UserRole = 'admin' | 'moderator' | 'runner' | 'user';

export function isVisibleOnMap(
  isVisible: boolean,
  trustScore: number,
  role: UserRole
): boolean {
  if (!isVisible) return false;
  if (role === 'admin' || role === 'moderator') return true;
  return trustScore >= 30;
}

export function canBeHiddenByAdmin(
  targetRole: UserRole,
  trustScore: number
): boolean {
  if (targetRole === 'admin') return false;
  return trustScore < 50;
}