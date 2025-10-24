export function openChest(): { type: string; xp: number; emoji: string } {
  const roll = Math.random() * 100;

  if (roll < 10) return { type: 'elmas', xp: 40, emoji: '💎' };
  if (roll < 40) return { type: 'gold', xp: 20, emoji: '🟨' };
  if (roll < 90) return { type: 'bronz', xp: 5, emoji: '🟫' };
  return { type: 'boş', xp: 0, emoji: '🚫' };
}