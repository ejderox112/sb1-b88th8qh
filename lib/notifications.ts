import { supabase } from './supabase';

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'chat_message'
  | 'group_invite'
  | 'task_completed'
  | 'level_up'
  | 'badge_earned';

interface NotificationData {
  type: NotificationType;
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Kullanıcının bildirim ayarlarını kontrol eder
 */
export async function checkNotificationEnabled(
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Varsayılan olarak tüm bildirimler açık
    return true;
  }

  const settingMap: Record<NotificationType, keyof typeof data> = {
    friend_request: 'friend_requests',
    friend_accepted: 'friend_accepted',
    chat_message: 'chat_messages',
    group_invite: 'group_invites',
    task_completed: 'task_completed',
    level_up: 'level_up',
    badge_earned: 'badge_earned',
  };

  const settingKey = settingMap[notificationType];
  return data[settingKey] !== false;
}

/**
 * Bildirim gönderir (kullanıcı ayarlarını kontrol eder)
 */
export async function sendNotification({
  type,
  userId,
  title,
  message,
  data = {},
}: NotificationData): Promise<boolean> {
  // Kullanıcının bu bildirim türünü almak isteyip istemediğini kontrol et
  const enabled = await checkNotificationEnabled(userId, type);
  if (!enabled) {
    return false;
  }

  // Notifications tablosuna ekle
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    data,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Bildirim gönderilemedi:', error);
    return false;
  }

  return true;
}

/**
 * Arkadaşlık isteği bildirimi gönderir
 */
export async function notifyFriendRequest(
  receiverId: string,
  requesterName: string,
  requestId: string
): Promise<void> {
  await sendNotification({
    type: 'friend_request',
    userId: receiverId,
    title: '🤝 Yeni Arkadaşlık İsteği',
    message: `${requesterName} size arkadaşlık isteği gönderdi`,
    data: { request_id: requestId, requester_name: requesterName },
  });
}

/**
 * Arkadaşlık kabul bildirimi gönderir
 */
export async function notifyFriendAccepted(
  requesterId: string,
  accepterName: string
): Promise<void> {
  await sendNotification({
    type: 'friend_accepted',
    userId: requesterId,
    title: '✅ Arkadaşlık İsteği Kabul Edildi',
    message: `${accepterName} arkadaşlık isteğinizi kabul etti`,
    data: { accepter_name: accepterName },
  });
}

/**
 * Yeni mesaj bildirimi gönderir
 */
export async function notifyChatMessage(
  receiverId: string,
  senderName: string,
  messagePreview: string
): Promise<void> {
  await sendNotification({
    type: 'chat_message',
    userId: receiverId,
    title: `💬 ${senderName}`,
    message: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
    data: { sender_name: senderName },
  });
}

/**
 * Grup davet bildirimi gönderir
 */
export async function notifyGroupInvite(
  invitedUserId: string,
  groupName: string,
  inviterName: string
): Promise<void> {
  await sendNotification({
    type: 'group_invite',
    userId: invitedUserId,
    title: '👥 Grup Daveti',
    message: `${inviterName} sizi "${groupName}" grubuna davet etti`,
    data: { group_name: groupName, inviter_name: inviterName },
  });
}

/**
 * Görev tamamlama bildirimi gönderir
 */
export async function notifyTaskCompleted(
  userId: string,
  taskName: string,
  xpEarned: number
): Promise<void> {
  await sendNotification({
    type: 'task_completed',
    userId,
    title: '🎯 Görev Tamamlandı!',
    message: `"${taskName}" görevini tamamladınız! +${xpEarned} XP`,
    data: { task_name: taskName, xp_earned: xpEarned },
  });
}

/**
 * Seviye atlama bildirimi gönderir
 */
export async function notifyLevelUp(
  userId: string,
  newLevel: number
): Promise<void> {
  await sendNotification({
    type: 'level_up',
    userId,
    title: '🎊 Seviye Atladınız!',
    message: `Tebrikler! Artık seviye ${newLevel}siniz!`,
    data: { new_level: newLevel },
  });
}

/**
 * Rozet kazanma bildirimi gönderir
 */
export async function notifyBadgeEarned(
  userId: string,
  badgeName: string,
  badgeDescription: string
): Promise<void> {
  await sendNotification({
    type: 'badge_earned',
    userId,
    title: '🏆 Yeni Rozet Kazandınız!',
    message: `"${badgeName}" rozetini kazandınız! ${badgeDescription}`,
    data: { badge_name: badgeName, badge_description: badgeDescription },
  });
}

/**
 * Kullanıcının okunmamış bildirim sayısını alır
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Bildirim sayısı alınamadı:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Tüm bildirimleri okundu olarak işaretler
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Bildirimler okundu işaretlenemedi:', error);
    return false;
  }

  return true;
}

/**
 * Belirli bir bildirimi okundu olarak işaretler
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Bildirim okundu işaretlenemedi:', error);
    return false;
  }

  return true;
}
