// adminApproval.ts
// Görev 50: Admin onayı gerektiren işlemler + XP cezası + manuel inceleme

type ApprovalRequest = {
  userId: string;
  type: 'gender_change' | 'content_flag' | 'identity_issue';
  reason: string;
  submittedAt: string;
};

export function shouldTriggerAdminApproval(type: string, changeCount: number): boolean {
  // Cinsiyet değişimi 3+ kez yapıldıysa admin onayı gerekir
  if (type === 'gender_change' && changeCount >= 3) return true;
  return false;
}

export function applyXpPenalty(currentXp: number, penalty: number): number {
  return Math.max(0, currentXp - penalty);
}

export function createApprovalRequest(userId: string, type: ApprovalRequest['type'], reason: string): ApprovalRequest {
  return {
    userId,
    type,
    reason,
    submittedAt: new Date().toISOString(),
  };
}

export function getApprovalLabel(type: ApprovalRequest['type']): string {
  switch (type) {
    case 'gender_change':
      return '🧬 Cinsiyet Değişimi İncelemesi';
    case 'content_flag':
      return '🚨 İçerik Şikayeti';
    case 'identity_issue':
      return '🆔 Kimlik Sorunu';
    default:
      return '🔍 İnceleme Talebi';
  }
}