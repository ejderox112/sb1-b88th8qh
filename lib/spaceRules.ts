// spaceRules.ts
// Görev 57: Mekân türü, görev sınırı ve erişim seviyesi

type SpaceType = 'hospital' | 'school' | 'mall' | 'cafe' | 'other';

const TASK_LIMITS: Record<SpaceType, number> = {
  hospital: 10,
  school: 8,
  mall: 6,
  cafe: 4,
  other: 5,
};

export function getTaskLimit(type: SpaceType): number {
  return TASK_LIMITS[type] ?? 5;
}

export function isRestrictedSpace(type: SpaceType): boolean {
  return type === 'hospital' || type === 'school';
}