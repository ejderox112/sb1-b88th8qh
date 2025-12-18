// Chat Konum Paylaşımı ve 3D Harita Entegrasyonu
// Client-side servis

import { supabase } from './supabase';
import * as Location from 'expo-location';

export interface LocationMessage {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  address?: string;
  share_duration?: number; // saniye
  is_live?: boolean;
}

export interface NearbyFriend {
  user_id: string;
  lat: number;
  lng: number;
  accuracy: number;
  avatar_url: string;
  nickname: string;
  level: number;
  is_friend: boolean;
  distance_meters: number;
  last_updated: string;
  expires_at: string;
}

export interface MediaLimits {
  is_premium: boolean;
  daily_photo_count: number;
  daily_photo_limit: number;
  photos_remaining: number;
  weekly_mb_used: number;
  weekly_mb_limit: number;
  mb_remaining: number;
  usage_percentage: number;
  status: string;
}

/**
 * 1. KONUM PAYLASIMI (CHAT'TE)
 */
export async function shareLocationInChat(
  groupId: string,
  options: {
    isLive?: boolean;
    shareDuration?: number; // saniye (varsayılan: 3600 = 1 saat)
    includeAddress?: boolean;
  } = {}
): Promise<string> {
  // Konum izni al
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Konum izni reddedildi');
  }

  // Mevcut konumu al
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const { latitude, longitude, altitude, heading, speed } = location.coords;
  const accuracy = location.coords.accuracy || 10;

  // Adres al (opsiyonel)
  let address: string | undefined;
  if (options.includeAddress) {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        address = `${place.street || ''} ${place.district || ''} ${place.city || ''}`.trim();
      }
    } catch (error) {
      console.warn('Adres alinamadi:', error);
    }
  }

  // Supabase fonksiyonunu çağır
  const { data, error } = await supabase.rpc('share_location_in_chat', {
    p_sender_id: (await supabase.auth.getUser()).data.user?.id,
    p_group_id: groupId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_accuracy: accuracy,
    p_address: address,
    p_share_duration: options.shareDuration || 3600,
    p_is_live: options.isLive || false,
  });

  if (error) throw error;

  return data; // message_id
}

/**
 * 2. CANLI KONUM GUNCELLEME (ARKA PLANDA)
 */
export async function startLiveLocationSharing(
  groupId: string,
  duration: number = 3600
): Promise<void> {
  // İlk konumu paylaş
  await shareLocationInChat(groupId, {
    isLive: true,
    shareDuration: duration,
    includeAddress: true,
  });

  // Arka plan konum güncellemesi (her 30 saniye)
  const locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 30000, // 30 saniye
      distanceInterval: 10, // 10 metre
    },
    async (location) => {
      const { latitude, longitude } = location.coords;
      const accuracy = location.coords.accuracy || 10;

      // live_locations tablosunu güncelle
      await supabase.from('live_locations').upsert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        group_id: groupId,
        lat: latitude,
        lng: longitude,
        accuracy: accuracy,
        is_sharing: true,
        updated_at: new Date().toISOString(),
      });
    }
  );

  // Duration sonunda durdur
  setTimeout(() => {
    locationSubscription.remove();
    stopLiveLocationSharing(groupId);
  }, duration * 1000);
}

/**
 * 3. CANLI KONUM DURDURMA
 */
export async function stopLiveLocationSharing(groupId: string): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id;

  await supabase
    .from('live_locations')
    .update({ is_sharing: false, expires_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('group_id', groupId);
}

/**
 * 4. 3D HARITADA YAKIN ARKADASLARI GETIR
 */
export async function getNearbyFriendsFor3D(): Promise<NearbyFriend[]> {
  const { data, error } = await supabase
    .from('nearby_friends_3d')
    .select('*')
    .order('distance_meters', { ascending: true })
    .limit(50);

  if (error) throw error;

  return data || [];
}

/**
 * 5. REALTIME - ARKADAS KONUM GUNCELLEME DINLE
 */
export function subscribeToFriendLocations(
  onLocationUpdate: (friend: NearbyFriend) => void
): () => void {
  const channel = supabase
    .channel('friend-locations')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_locations',
        filter: 'is_sharing=eq.true',
      },
      async (payload) => {
        // Yeni konum geldiğinde view'den çek
        const { data } = await supabase
          .from('nearby_friends_3d')
          .select('*')
          .eq('user_id', payload.new.user_id)
          .single();

        if (data) {
          onLocationUpdate(data);
        }
      }
    )
    .subscribe();

  // Cleanup fonksiyonu
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * 6. MEDIA LIMITLERINI KONTROL ET
 */
export async function getMediaLimits(): Promise<MediaLimits> {
  const { data, error } = await supabase
    .from('user_chat_media_stats')
    .select('*')
    .single();

  if (error) throw error;

  return data;
}

/**
 * 7. FOTO GONDERME (LIMIT KONTROLLU)
 */
export async function sendPhotoInChat(
  groupId: string,
  photoUri: string,
  compressedSize: number
): Promise<string> {
  // Önce limitleri kontrol et
  const limits = await getMediaLimits();

  if (!limits.is_premium && limits.photos_remaining <= 0) {
    throw new Error(
      `Günlük foto limiti aşıldı (${limits.daily_photo_limit}/${limits.daily_photo_limit}). Premium üyelik için yükseltin.`
    );
  }

  if (limits.mb_remaining < compressedSize / 1048576) {
    throw new Error(
      `Haftalık veri limiti aşıldı. Kalan: ${limits.mb_remaining.toFixed(2)} MB`
    );
  }

  // Dosyayı yükle
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const fileName = `${userId}-${Date.now()}.jpg`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('chat-photos')
    .upload(fileName, {
      uri: photoUri,
      type: 'image/jpeg',
      name: fileName,
    });

  if (uploadError) throw uploadError;

  // Public URL al
  const { data: urlData } = supabase.storage
    .from('chat-photos')
    .getPublicUrl(fileName);

  // Mesaj gönder (trigger otomatik limit güncelleyecek)
  const { data: messageData, error: messageError } = await supabase
    .from('group_messages')
    .insert({
      sender_id: userId,
      group_id: groupId,
      message_type: 'image',
      content: 'Fotoğraf gönderdi',
      media_url: urlData.publicUrl,
      media_size: compressedSize,
    })
    .select()
    .single();

  if (messageError) throw messageError;

  return messageData.id;
}

/**
 * 8. NAVIGASYON BASLAT (3D HARITADA "GIT" BUTONU)
 */
export async function navigateToFriend(friendUserId: string): Promise<void> {
  // Arkadaşın konumunu al
  const { data: friendLocation, error } = await supabase
    .from('live_locations')
    .select('lat, lng, nickname')
    .eq('user_id', friendUserId)
    .eq('is_sharing', true)
    .single();

  if (error || !friendLocation) {
    throw new Error('Arkadaşın konumu bulunamadı veya paylaşım durdurulmuş');
  }

  // Navigasyon event'i gönder (3D harita bileşeni dinleyecek)
  const event = new CustomEvent('navigate-to-friend', {
    detail: {
      targetLat: friendLocation.lat,
      targetLng: friendLocation.lng,
      targetName: friendLocation.nickname,
    },
  });
  window.dispatchEvent(event);
}

/**
 * 9. PREMIUM UPGRADE KONTROLU
 */
export async function checkPremiumUpgradeNeeded(): Promise<{
  needsUpgrade: boolean;
  reason: string;
  upgradeUrl: string;
}> {
  const limits = await getMediaLimits();

  if (limits.status === 'Limit Aşıldı' || limits.status === 'Data Limiti Aşıldı') {
    return {
      needsUpgrade: true,
      reason: limits.status,
      upgradeUrl: '/premium-upgrade',
    };
  }

  return {
    needsUpgrade: false,
    reason: 'Limit OK',
    upgradeUrl: '',
  };
}

/**
 * KULLANIM ÖRNEKLERİ:
 * 
 * // 1. Tek seferlik konum paylaş
 * await shareLocationInChat(groupId, { includeAddress: true });
 * 
 * // 2. Canlı konum paylaş (1 saat)
 * await startLiveLocationSharing(groupId, 3600);
 * 
 * // 3. Yakındaki arkadaşları getir (3D harita için)
 * const friends = await getNearbyFriendsFor3D();
 * 
 * // 4. Realtime konum dinle
 * const unsubscribe = subscribeToFriendLocations((friend) => {
 *   console.log(`${friend.nickname} konumu güncellendi:`, friend.lat, friend.lng);
 * });
 * 
 * // 5. Foto gönder (limit kontrollü)
 * await sendPhotoInChat(groupId, photoUri, compressedSize);
 * 
 * // 6. Arkadaşa git (navigasyon)
 * await navigateToFriend(friendUserId);
 * 
 * // 7. Limit kontrolü
 * const limits = await getMediaLimits();
 * console.log(`Kalan foto: ${limits.photos_remaining}`);
 */
