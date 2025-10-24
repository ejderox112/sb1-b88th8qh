// interactionScore.ts
// Görev 50: Kullanıcı etkileşim puanı + grup katkısı + sosyal görünürlük

type InteractionData = {
  messagesSent: number;
  tasksCompleted: number;
  reactionsGiven: number;
  groupContributions: number;
};

export function calculateInteractionScore(data: InteractionData): number {
  const { messagesSent, tasksCompleted, reactionsGiven, groupContributions } = data;
  const score =
    messagesSent * 1 +
    tasksCompleted * 3 +
    reactionsGiven * 2 +
    groupContributions * 5;
  return score;
}

export function getInteractionLabel(score: number): string {
  if (score < 50) return '🌱 Yeni Katılımcı';
  if (score < 150) return '🌟 Aktif Üye';
  if (score < 300) return '🔥 Güçlü Katkıcı';
  return '👑 Topluluk Lideri';
}

export function isSociallyVisible(score: number): boolean {
  // Etkileşim puanı 100+ ise haritada görünürlük ve sosyal efektler açılır
  return score >= 100;
}