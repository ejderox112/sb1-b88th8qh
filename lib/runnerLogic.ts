// runnerLogic.ts
// Görev 50: Görev taşıyıcıları + canlı konum + teslimat süresi + XP paylaşımı

type RunnerTask = {
  id: string;
  assignedAt: string;
  deliveredAt?: string;
  xpValue: number;
};

type RunnerProfile = {
  userId: string;
  location: { lat: number; lng: number };
  isActive: boolean;
};

export function isRunnerActive(profile: RunnerProfile): boolean {
  return profile.isActive;
}

export function calculateDeliveryTime(task: RunnerTask): number | null {
  if (!task.deliveredAt) return null;
  const start = new Date(task.assignedAt).getTime();
  const end = new Date(task.deliveredAt).getTime();
  return Math.floor((end - start) / 1000); // saniye cinsinden
}

export function getXpSplit(task: RunnerTask): { runnerXp: number; senderXp: number } {
  const runnerXp = Math.floor(task.xpValue * 0.7);
  const senderXp = task.xpValue - runnerXp;
  return { runnerXp, senderXp };
}

export function canDeliverTask(distance: number): boolean {
  // Teslimat mesafesi 1000 metreyi geçmemeli
  return distance <= 1000;
}