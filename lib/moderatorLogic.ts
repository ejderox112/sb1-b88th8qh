// moderatorLogic.ts
// Görev 50: Moderatör yetkileri + görev onayı + rozet dağıtımı

type Moderator = {
  userId: string;
  level: number;
  trustScore: number;
  approvedTasks: number;
};

type Task = {
  id: string;
  submittedBy: string;
  approved: boolean;
};

export function isModerator(profile: Moderator): boolean {
  return profile.level >= 20 && profile.trustScore >= 80;
}

export function canApproveTask(profile: Moderator): boolean {
  return isModerator(profile);
}

export function approveTask(task: Task): Task {
  return { ...task, approved: true };
}

export function getModeratorBadge(profile: Moderator): string {
  if (profile.approvedTasks >= 100) return '👑 Baş Moderatör';
  if (profile.approvedTasks >= 30) return '🛡️ Kıdemli Moderatör';
  if (profile.approvedTasks >= 10) return '🎖️ Yeni Moderatör';
  return '🔍 Gözlemci';
}