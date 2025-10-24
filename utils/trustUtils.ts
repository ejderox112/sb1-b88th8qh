export function calculateTrustScore(
  approvals: number,
  rejections: number,
  flags: number
): number {
  const score = approvals * 2 - rejections - flags * 1.5;
  return Math.max(0, Math.floor(score));
}

export function isTrusted(score: number): boolean {
  return score >= 50;
}