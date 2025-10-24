// antiAbuse.ts
// Görev 50: Spam koruması + görev suistimali + içerik tekrar kontrolü

type AbuseCheck = {
  recentMessages: string[];
  recentTasks: { title: string; completedAt: string }[];
  recentUploads: string[]; // içerik hash'leri
};

export function isSpamming(messages: string[]): boolean {
  const threshold = 5;
  const lastFew = messages.slice(-threshold);
  const unique = new Set(lastFew);
  return unique.size <= 2;
}

export function isTaskAbused(tasks: { title: string }[]): boolean {
  const titles = tasks.map(t => t.title.toLowerCase());
  const counts: Record<string, number> = {};
  titles.forEach(t => {
    counts[t] = (counts[t] || 0) + 1;
  });
  return Object.values(counts).some(count => count >= 3);
}

export function isDuplicateContent(uploads: string[]): boolean {
  const unique = new Set(uploads);
  return unique.size < uploads.length;
}