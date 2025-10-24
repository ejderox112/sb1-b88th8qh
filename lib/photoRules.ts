export function isValidPhotoURL(url: string): boolean {
  return url.startsWith('https://') && url.includes('.jpg');
}

export function isPhotoApproved(approved: boolean): boolean {
  return approved === true;
}

export function isHashUnique(hash: string, existingHashes: string[]): boolean {
  return !existingHashes.includes(hash);
}