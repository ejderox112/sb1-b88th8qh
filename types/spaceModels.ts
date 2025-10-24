export type SpaceType = 'hospital' | 'school' | 'mall' | 'cafe' | 'other';

export interface Space {
  id: string;
  name: string;
  type: SpaceType;
  task_limit: number;
  created_by: string;
  created_at: string;
}