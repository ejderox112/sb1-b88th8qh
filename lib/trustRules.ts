// trustRules.ts
// Görev 58: Güven puanı mantığı, spam davranışı ve rozet etkisi

type ActionType = 'approved_photo' | 'rejected_photo' | 'completed_task' | 'flagged_content';

export function updateTrustScore(currentScore: number, action: ActionType): number {
  switch (action) {
    case 'approved_photo':
      return currentScore + 5;
    case 'rejected_photo':
      return currentScore - 10;
    case 'completed_task':
      return currentScore + 2;
    case 'flagged_content':
      return currentScore - 15;
    default:
      return currentScore;
  }
}

export function shouldRestrictUser(trustScore: number): boolean {
  return trustScore < 20;
}

export function shouldAwardTrustBadge(trustScore: number): boolean {
  return trustScore >= 80;
}