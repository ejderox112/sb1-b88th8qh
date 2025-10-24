export type UserRole = 'admin' | 'moderator' | 'runner' | 'user';
export type SpaceType = 'hospital' | 'school' | 'mall' | 'cafe' | 'other';
export type TaskStatus = 'pending' | 'completed' | 'rejected';

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

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  task_limit: number;
  created_by: string;
  created_at: string;
}

export interface Task {
  id: string;
  space_id: string;
  title: string;
  xp_value: number;
  status: TaskStatus;
  assigned_to: string;
  created_at: string;
}

export interface Photo {
  id: string;
  space_id: string;
  url: string;
  hash: string;
  approved: boolean;
  uploaded_by: string;
  created_at: string;
}

export interface Badge {
  id: string;
  user_id: string;
  label: string;
  earned_at: string;
}