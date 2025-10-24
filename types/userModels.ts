export type UserRole = 'admin' | 'moderator' | 'runner' | 'user';

export interface User {
  id: string;
  auth_id: string;
  username: string;
  role: UserRole;
  xp: number;
  level: number;
  trust_score: number;
  is_visible: boolean;
  created_at: string;
}