// avatarLogic.ts
// Görev 50: Avatar parçaları + bozuk cinsiyet + görünürlük + özelleştirme

type AvatarProfile = {
  gender: string;
  avatarParts: string[];
  showAvatar: boolean;
};

export function getDefaultAvatar(gender: string): string {
  switch (gender) {
    case 'Erkek':
      return 'avatar_male_default';
    case 'Kadın':
      return 'avatar_female_default';
    case 'Belirtilmemiş':
      return 'avatar_neutral_default';
    case 'Bozuk Cinsiyet':
      return 'avatar_glitch_default';
    default:
      return 'avatar_unknown';
  }
}

export function getVisibleAvatar(profile: AvatarProfile): string {
  if (!profile.showAvatar) return 'avatar_hidden';
  return getDefaultAvatar(profile.gender);
}

export function applyAvatarParts(base: string, parts: string[]): string {
  // Parçaları sırayla uygula (örnek: saç, gözlük, arka plan vs.)
  return [base, ...parts].join('+');
}

export function isGlitchAvatar(gender: string): boolean {
  return gender === 'Bozuk Cinsiyet';
}