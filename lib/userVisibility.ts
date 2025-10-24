// userVisibility.ts
// Görev 50: Haritada görünürlük + seviye bazlı mesafe + cinsiyet/yaş filtreleme

type Profile = {
  id: string;
  level: number;
  gender: string;
  age: number;
  show_gender: boolean;
  show_age: boolean;
  location: { lat: number; lng: number };
};

export function getVisibilityRadius(level: number): number {
  if (level < 10) return 0;
  if (level < 40) return 50; // metre
  return 500; // metre
}

export function isVisibleToUser(viewer: Profile, target: Profile): boolean {
  const radius = getVisibilityRadius(viewer.level);
  const distance = calculateDistance(viewer.location, target.location);
  return distance <= radius;
}

export function getDisplayGender(target: Profile): string {
  return target.show_gender ? target.gender : 'Gizli';
}

export function getDisplayAge(target: Profile): string {
  return target.show_age ? `${target.age}` : 'Gizli';
}

function calculateDistance(loc1: { lat: number; lng: number }, loc2: { lat: number; lng: number }): number {
  const R = 6371e3; // metre
  const φ1 = (loc1.lat * Math.PI) / 180;
  const φ2 = (loc2.lat * Math.PI) / 180;
  const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return d; // metre cinsinden
}