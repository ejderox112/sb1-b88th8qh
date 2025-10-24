export interface Badge {
  id: string;
  label: string;
  description: string;
  xp_required: number;
}

export const BADGES: Badge[] = [
  {
    id: 'explorer',
    label: 'Keşifçi',
    description: '5 farklı mekânda görev tamamladı',
    xp_required: 100,
  },
  {
    id: 'helper',
    label: 'Yardımsever',
    description: '10 görev onaylandı',
    xp_required: 250,
  },
  {
    id: 'trusted',
    label: 'Güvenilir',
    description: 'Güven puanı 75 üzerine çıktı',
    xp_required: 500,
  },
];