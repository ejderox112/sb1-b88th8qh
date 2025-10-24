export function suggestTags(userInterests: string[], allTags: string[]): string[] {
  return allTags.filter(tag => userInterests.includes(tag)).slice(0, 5);
}

export function generateTitle(description: string): string {
  if (description.includes('fotoğraf')) return 'Fotoğraf Görevi';
  if (description.includes('yön bulma')) return 'Navigasyon Görevi';
  if (description.includes('yorum')) return 'Görüş Bildirme Görevi';
  return 'Görev Başlığı';
}