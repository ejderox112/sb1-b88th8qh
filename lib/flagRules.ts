export function isFlagReasonValid(reason: string): boolean {
  return reason.length >= 5 && reason.length <= 200;
}

export function isFlagged(flagCount: number): boolean {
  return flagCount > 0;
}

export function isSpam(reason: string): boolean {
  const spamKeywords = ['reklam', 'link', 'para', 'indirim', 'takip et'];
  return spamKeywords.some(keyword => reason.toLowerCase().includes(keyword));
}