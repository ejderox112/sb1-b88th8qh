// roleRules.ts
// Görev 59: Rol bazlı yetki kontrolü ve erişim sınırları

type UserRole = 'admin' | 'moderator' | 'runner' | 'user';

export function canApproveContent(role: UserRole): boolean {
  return role === 'admin' || role === 'moderator';
}

export function canHideUser(role: UserRole): boolean {
  return role === 'admin';
}

export function canAssignTasks(role: UserRole): boolean {
  return role === 'admin' || role === 'moderator';
}

export function canCompleteTasks(role: UserRole): boolean {
  return role === 'runner' || role === 'user';
}