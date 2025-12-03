/**
 * Yasaklı nickname'leri kontrol eder
 * SeekMap ve varyasyonları sadece admin/yetkililer kullanabilir
 */

const RESERVED_NICKNAMES = [
  'seekmap',
  'seekmap_editor',
  'seekmap_editör',
  'seekmap_destek',
  'seekmap_support',
  'seekmap_admin',
  'seekmap_mod',
  'seekmap_moderator',
  'admin',
  'moderator',
  'support',
  'destek',
];

export function isNicknameReserved(nickname: string): boolean {
  const normalized = nickname.toLowerCase().trim();
  
  // Tam eşleşme kontrolü
  if (RESERVED_NICKNAMES.includes(normalized)) {
    return true;
  }
  
  // SeekMap ile başlayan herhangi bir nickname
  if (normalized.startsWith('seekmap')) {
    return true;
  }
  
  return false;
}

export function validateNickname(nickname: string, isAdmin: boolean = false): { valid: boolean; error?: string } {
  if (!nickname || nickname.trim().length < 3) {
    return { valid: false, error: 'Nickname en az 3 karakter olmalıdır' };
  }
  
  if (nickname.length > 20) {
    return { valid: false, error: 'Nickname en fazla 20 karakter olabilir' };
  }
  
  // Admin değilse ve reserved nickname ise reddet
  if (!isAdmin && isNicknameReserved(nickname)) {
    return { valid: false, error: 'Bu nickname korunmuştur ve kullanılamaz' };
  }
  
  // Geçerli karakterler: harf, rakam, alt çizgi, tire
  const validPattern = /^[a-zA-ZğüşıöçĞÜŞİÖÇ0-9_-]+$/;
  if (!validPattern.test(nickname)) {
    return { valid: false, error: 'Nickname sadece harf, rakam, _ ve - içerebilir' };
  }
  
  return { valid: true };
}
