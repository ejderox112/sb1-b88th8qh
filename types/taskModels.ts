export type TaskStatus = 'pending' | 'completed' | 'rejected';

export interface Task {
  id: string;
  space_id: string;
  title: string;
  xp_value: number;
  status: TaskStatus;
  assigned_to: string;
  created_at: string;
}