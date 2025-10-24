export interface Approval {
  id: string;
  content_id: string;
  content_type: 'photo' | 'task' | 'comment';
  approved_by: string;
  approved_at: string;
  status: 'approved' | 'rejected';
}