// approvalRules.ts
// Görev 51: İçerik türüne göre admin/moderator onay mantığı

type ContentType = 'photo' | 'task' | 'badge' | 'space';

export function requiresApproval(type: ContentType): boolean {
  switch (type) {
    case 'photo':
    case 'badge':
      return true; // Görsel ve rozetler manuel onay gerektirir
    case 'task':
    case 'space':
      return false; // Görev ve mekânlar sistemsel olarak eklenebilir
    default:
      return true;
  }
}

export function getApproverRole(type: ContentType): 'admin' | 'moderator' {
  switch (type) {
    case 'photo':
      return 'moderator'; // Fotoğraflar topluluk moderatörleri tarafından incelenir
    case 'badge':
      return 'admin'; // Rozetler sistem yöneticisi tarafından atanır
    default:
      return 'moderator';
  }
}