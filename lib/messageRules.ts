// messageRules.ts
// Görev 50: Mesaj gizliliği + admin denetimi + erişim kontrolü

export function canViewMessage(userId: string, senderId: string, receiverId: string, isAdmin: boolean): boolean {
  // Sadece gönderen, alıcı ve ana admin mesajı görebilir
  return userId === senderId || userId === receiverId || isAdmin;
}

export function canSendMessage(senderId: string, receiverId: string, blockedPairs: [string, string][]): boolean {
  // Eğer kullanıcılar birbirini engellemişse mesaj gönderilemez
  return !blockedPairs.some(
    ([blocker, blocked]) =>
      (blocker === senderId && blocked === receiverId) ||
      (blocker === receiverId && blocked === senderId)
  );
}

export function isMessageDownloadable(userId: string, isAdmin: boolean): boolean {
  // Sadece admin mesaj içeriğini indirebilir
  return isAdmin;
}