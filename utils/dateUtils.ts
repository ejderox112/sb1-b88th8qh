export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function daysAgo(dateStr: string): number {
  const now = new Date();
  const past = new Date(dateStr);
  const diff = now.getTime() - past.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function timestamp(): string {
  return new Date().toISOString();
}