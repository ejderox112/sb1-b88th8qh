export type FlagType = 'spam' | 'abuse' | 'duplicate' | 'inappropriate';

export interface Flag {
  id: string;
  content_id: string;
  content_type: 'photo' | 'task' | 'comment';
  flagged_by: string;
  reason: FlagType;
  created_at: string;
}