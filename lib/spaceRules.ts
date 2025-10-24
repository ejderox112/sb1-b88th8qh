export function isSpaceLimitReached(taskCount: number, taskLimit: number): boolean {
  return taskCount >= taskLimit;
}

export function isValidSpaceType(type: string): boolean {
  const validTypes = ['hospital', 'school', 'mall', 'cafe', 'other'];
  return validTypes.includes(type);
}