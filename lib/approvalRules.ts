export function isApprovalValid(
  approved_by: string,
  approved_at: string
): boolean {
  return approved_by.length > 0 && !isNaN(Date.parse(approved_at));
}

export function isRejected(status: string): boolean {
  return status === 'rejected';
}

export function isPending(status: string): boolean {
  return status === 'pending';
}