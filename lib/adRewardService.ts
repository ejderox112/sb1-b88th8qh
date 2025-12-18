// REKLAM SİSTEMİ - Client Servisleri
// Foto + Kullanıcı Görünürlüğü için Reklam İzleme

import { supabase } from './supabase';
import { Alert } from 'react-native';

// AdMob / Unity Ads entegrasyonu için interface
interface AdReward {
  success: boolean;
  ad_id: string;
  reward_type: 'extra_photo' | 'visibility_boost' | 'premium_trial';
  reward_amount: number;
  expires_at: string;
  message: string;
  boost_duration_minutes?: number;
}

interface MediaStats {
  is_premium: boolean;
  daily_photo_count: number;
  daily_photo_limit: number;
  extra_photos_from_ads: number;
  photos_remaining: number;
  weekly_mb_used: number;
  weekly_mb_limit: number;
  mb_remaining: number;
  usage_percentage: number;
  total_ads_watched: number;
  lifetime_photos_from_ads: number;
  status: string;
}

interface VisibilityStats {
  user_id: string;
  base_visible_users: number;
  extra_visible_from_ads: number;
  total_visible_users: number;
  visibility_radius: number;
  ad_boost_expires_at: string | null;
  boost_active: boolean;
  boost_remaining_minutes: number;
}

/**
 * 1. FOTO LİMİTİ KONTROLÜ VE REKLAM SORMA
 */
export async function checkPhotoLimitAndAskForAd(): Promise<boolean> {
  const stats = await getMediaStats();

  // Premium kullanıcılar sınırsız
  if (stats.is_premium) {
    return true;
  }

  // Limit aşıldıysa reklam öner
  if (stats.photos_remaining <= 0) {
    return new Promise((resolve) => {
      Alert.alert(
        '📸 Foto Limiti Doldu',
        `Günlük ${stats.daily_photo_limit} foto limitiniz doldu.\n\n` +
          `🎬 Reklam izleyerek +2 foto daha kazanabilirsiniz!\n\n` +
          `Toplam izlediğiniz reklam: ${stats.total_ads_watched}`,
        [
          {
            text: '❌ İptal',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: '🎬 Reklam İzle',
            onPress: async () => {
              const success = await watchAdForPhotos();
              resolve(success);
            },
          },
        ]
      );
    });
  }

  // Uyarı göster (1 foto kaldıysa)
  if (stats.photos_remaining === 1) {
    Alert.alert(
      '⚠️ Son Foto',
      `Sadece ${stats.photos_remaining} foto hakkınız kaldı!\n\n` +
        `Reklam izleyerek devam edebilirsiniz.`,
      [{ text: 'Tamam' }]
    );
  }

  return true;
}

/**
 * 2. REKLAM İZLE - EKSTRA FOTO KAZAN
 */
export async function watchAdForPhotos(): Promise<boolean> {
  try {
    // AdMob reklamı göster (react-native-google-mobile-ads)
    // const adUnitId = Platform.select({
    //   ios: 'ca-app-pub-xxxxx/xxxxx',
    //   android: 'ca-app-pub-xxxxx/xxxxx',
    // });

    // SIMÜLE EDİLMİŞ REKLAM - Gerçekte AdMob entegrasyonu yapılacak
    await simulateAdWatch();

    // Supabase'e reklam kaydı oluştur
    const { data, error } = await supabase.rpc('watch_ad_for_extra_photos', {
      p_ad_provider: 'admob',
      p_ad_unit_id: 'ca-app-pub-test-12345', // Test ID
    });

    if (error) throw error;

    const reward = data as AdReward;

    Alert.alert(
      '🎉 Ödül Kazandınız!',
      reward.message || `${reward.reward_amount} ekstra foto kazandınız!`,
      [{ text: 'Harika!' }]
    );

    return true;
  } catch (error) {
    console.error('Reklam hatası:', error);
    Alert.alert('Hata', 'Reklam yüklenemedi. Lütfen tekrar deneyin.');
    return false;
  }
}

/**
 * 3. KULLANICI GÖRÜNÜRLÜĞÜ KONTROLÜ VE REKLAM SORMA
 */
export async function checkVisibilityLimitAndAskForAd(): Promise<boolean> {
  const stats = await getVisibilityStats();

  // Boost zaten aktifse veya kullanıcı memnunsa
  if (stats.boost_active) {
    return true;
  }

  return new Promise((resolve) => {
    Alert.alert(
      '👥 Daha Fazla Kullanıcı Gör',
      `Şu anda 500m yarıçapında ${stats.base_visible_users} kullanıcı görebiliyorsunuz.\n\n` +
        `🎬 Reklam izleyerek +10 kullanıcı daha görün! (1 saat boyunca)`,
      [
        {
          text: '❌ Hayır',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: '🎬 Reklam İzle',
          onPress: async () => {
            const success = await watchAdForVisibility();
            resolve(success);
          },
        },
      ]
    );
  });
}

/**
 * 4. REKLAM İZLE - DAHA FAZLA KULLANICI GÖR
 */
export async function watchAdForVisibility(): Promise<boolean> {
  try {
    // SIMÜLE EDİLMİŞ REKLAM
    await simulateAdWatch();

    // Supabase'e reklam kaydı oluştur
    const { data, error } = await supabase.rpc('watch_ad_for_user_visibility', {
      p_ad_provider: 'admob',
      p_ad_unit_id: 'ca-app-pub-test-67890',
    });

    if (error) throw error;

    const reward = data as AdReward;

    Alert.alert(
      '🎉 Görünürlük Arttı!',
      reward.message ||
        `${reward.boost_duration_minutes} dakika boyunca ${reward.reward_amount} kullanıcı daha görebileceksiniz!`,
      [{ text: 'Harika!' }]
    );

    return true;
  } catch (error) {
    console.error('Reklam hatası:', error);
    Alert.alert('Hata', 'Reklam yüklenemedi. Lütfen tekrar deneyin.');
    return false;
  }
}

/**
 * 5. MEDYA İSTATİSTİKLERİNİ GETİR
 */
export async function getMediaStats(): Promise<MediaStats> {
  const { data, error } = await supabase
    .from('user_chat_media_stats')
    .select('*')
    .single();

  if (error) throw error;

  return data;
}

/**
 * 6. GÖRÜNÜRLÜk İSTATİSTİKLERİNİ GETİR
 */
export async function getVisibilityStats(): Promise<VisibilityStats> {
  const { data, error } = await supabase
    .from('user_visibility_stats')
    .select('*')
    .single();

  if (error) throw error;

  return data;
}

/**
 * 7. REKLAM SİMÜLASYONU (TEST İÇİN)
 */
async function simulateAdWatch(): Promise<void> {
  return new Promise((resolve) => {
    // Gerçek AdMob entegrasyonu buraya gelecek:
    // import { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
    //
    // const rewarded = RewardedAd.createForAdRequest('ca-app-pub-xxx');
    // rewarded.load();
    // rewarded.show();

    // Şimdilik 2 saniye bekle
    setTimeout(() => {
      resolve();
    }, 2000);
  });
}

/**
 * 8. FOTO GÖNDERME (LIMIT KONTROLLÜ + REKLAM DESTEKLİ)
 */
export async function sendPhotoWithLimitCheck(
  groupId: string,
  photoUri: string,
  compressedSize: number
): Promise<string | null> {
  // Önce limit kontrolü yap, gerekirse reklam göster
  const canSend = await checkPhotoLimitAndAskForAd();

  if (!canSend) {
    return null; // Kullanıcı reklam izlemek istemedi
  }

  // Normal foto gönderme işlemi
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

  const { data: urlData } = supabase.storage
    .from('chat-photos')
    .getPublicUrl(fileName);

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

  if (messageError) {
    // FOTO_LIMIT_EXCEEDED hatası gelirse yeniden reklam öner
    if (messageError.message?.includes('FOTO_LIMIT_EXCEEDED')) {
      Alert.alert(
        'Limit Aşıldı',
        'Foto limiti doldu. Reklam izleyerek devam edebilirsiniz.',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Reklam İzle',
            onPress: async () => {
              await watchAdForPhotos();
              // Tekrar dene
              return sendPhotoWithLimitCheck(groupId, photoUri, compressedSize);
            },
          },
        ]
      );
      return null;
    }
    throw messageError;
  }

  return messageData.id;
}

/**
 * 9. LIMIT DURUMU GÖSTERGESİ (UI COMPONENT İÇİN)
 */
export async function getLimitStatusForUI(): Promise<{
  photoStatus: string;
  photoColor: string;
  visibilityStatus: string;
  visibilityColor: string;
  showAdButton: boolean;
}> {
  const mediaStats = await getMediaStats();
  const visibilityStats = await getVisibilityStats();

  const photoStatus =
    mediaStats.photos_remaining > 0
      ? `${mediaStats.photos_remaining} foto kaldı`
      : '🎬 Reklam izle';

  const photoColor = mediaStats.photos_remaining > 2 ? '#4CAF50' : '#FF9800';

  const visibilityStatus = visibilityStats.boost_active
    ? `+${visibilityStats.extra_visible_from_ads} kullanıcı (${Math.ceil(
        visibilityStats.boost_remaining_minutes
      )} dk)`
    : `${visibilityStats.total_visible_users} kullanıcı`;

  const visibilityColor = visibilityStats.boost_active ? '#4CAF50' : '#999';

  return {
    photoStatus,
    photoColor,
    visibilityStatus,
    visibilityColor,
    showAdButton: mediaStats.photos_remaining === 0 || !visibilityStats.boost_active,
  };
}

/**
 * 10. ADMOB ENTEGRASYONU (GERÇEK UYGULAMA)
 * 
 * npm install react-native-google-mobile-ads
 * 
 * import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
 * 
 * const adUnitId = __DEV__ 
 *   ? TestIds.REWARDED 
 *   : Platform.select({
 *       ios: 'ca-app-pub-xxxxx/xxxxx',
 *       android: 'ca-app-pub-xxxxx/xxxxx',
 *     });
 * 
 * const rewarded = RewardedAd.createForAdRequest(adUnitId);
 * 
 * rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
 *   rewarded.show();
 * });
 * 
 * rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
 *   console.log('Kullanıcı ödül kazandı:', reward);
 *   // Supabase fonksiyonunu çağır
 * });
 * 
 * rewarded.load();
 */

/**
 * KULLANIM ÖRNEKLERİ:
 * 
 * // 1. Foto göndermeden önce
 * const messageId = await sendPhotoWithLimitCheck(groupId, photoUri, size);
 * if (!messageId) {
 *   console.log('Kullanıcı reklam izlemedi');
 * }
 * 
 * // 2. Harita açıldığında görünürlük kontrolü
 * useEffect(() => {
 *   checkVisibilityLimitAndAskForAd();
 * }, []);
 * 
 * // 3. UI'de limit göstergesi
 * const status = await getLimitStatusForUI();
 * <Text style={{ color: status.photoColor }}>{status.photoStatus}</Text>
 * 
 * // 4. Manuel reklam izleme butonu
 * <Button 
 *   title="🎬 Reklam İzle (+2 Foto)" 
 *   onPress={watchAdForPhotos}
 * />
 */
