// YEREL İŞLETME REKLAM PLATFORMU - Client Servisleri
// YouTube/Instagram/Facebook Video Reklamları

import { supabase } from './supabase';
import { Alert } from 'react-native';

export interface BusinessProfile {
  id: string;
  business_name: string;
  business_type: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  email: string;
  website: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  is_verified: boolean;
  is_active: boolean;
}

export interface BusinessAd {
  ad_id: string;
  business_id: string;
  business_name: string;
  title: string;
  description: string;
  video_platform: 'youtube' | 'instagram' | 'facebook' | 'vimeo' | 'custom';
  video_url: string;
  thumbnail_url: string;
  duration_seconds: number;
  distance_meters: number;
  cost_per_view: number;
  cost_per_click: number;
}

export interface AdStats {
  ad_id: string;
  title: string;
  status: string;
  budget_total: number;
  budget_remaining: number;
  total_impressions: number;
  total_views: number;
  total_clicks: number;
  total_spent: number;
  ctr_percentage: number; // Click Through Rate
  cost_per_acquisition: number;
}

/**
 * 1. YAKINDAKİ REKLAMLARI GETİR
 */
export async function getNearbyBusinessAds(
  latitude: number,
  longitude: number,
  maxDistance: number = 5000
): Promise<BusinessAd[]> {
  try {
    const { data, error } = await supabase.rpc('get_nearby_ads', {
      p_user_lat: latitude,
      p_user_lng: longitude,
      p_max_distance_meters: maxDistance,
      p_limit: 10,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Reklamlar alınamadı:', error);
    return [];
  }
}

/**
 * 2. REKLAM GÖRÜNTÜLENME KAYDET (EKRANDA GÖRÜNDÜ)
 */
export async function recordAdImpression(
  adId: string,
  userLat: number,
  userLng: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('record_ad_impression', {
      p_ad_id: adId,
      p_user_lat: userLat,
      p_user_lng: userLng,
    });

    if (error) throw error;

    console.log('Reklam görüntüleme kaydedildi:', data);
    return true;
  } catch (error) {
    console.error('Görüntüleme kaydedilemedi:', error);
    return false;
  }
}

/**
 * 3. REKLAM TIKLANMA KAYDET (DETAY AÇILDI)
 */
export async function recordAdClick(
  adId: string,
  userLat: number,
  userLng: number
): Promise<{ success: boolean; businessUrl?: string; businessPhone?: string }> {
  try {
    const { data, error } = await supabase.rpc('record_ad_click', {
      p_ad_id: adId,
      p_user_lat: userLat,
      p_user_lng: userLng,
    });

    if (error) throw error;

    return {
      success: true,
      businessUrl: data.business_url,
      businessPhone: data.business_phone,
    };
  } catch (error) {
    console.error('Tıklama kaydedilemedi:', error);
    return { success: false };
  }
}

/**
 * 4. İŞLETME KAYDI OLUŞTUR
 */
export async function createBusinessProfile(business: {
  business_name: string;
  business_type: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  phone: string;
  email: string;
  website?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
}): Promise<string> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const { data, error } = await supabase
      .from('business_profiles')
      .insert({
        owner_user_id: userId,
        ...business,
      })
      .select()
      .single();

    if (error) throw error;

    Alert.alert(
      'İşletme Kaydı Oluşturuldu',
      'Doğrulama belgelerini yükleyerek işletmenizi aktif hale getirebilirsiniz.'
    );

    return data.id;
  } catch (error) {
    console.error('İşletme kaydı oluşturulamadı:', error);
    Alert.alert('Hata', 'İşletme kaydı oluşturulamadı.');
    throw error;
  }
}

/**
 * 5. VIDEO REKLAM OLUŞTUR
 */
export async function createBusinessAd(ad: {
  business_id: string;
  title: string;
  description: string;
  video_platform: 'youtube' | 'instagram' | 'facebook';
  video_url: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  target_radius_meters?: number;
  budget_total: number;
  cost_per_view?: number;
  cost_per_click?: number;
  start_date?: string;
  end_date?: string;
}): Promise<string> {
  try {
    // Video ID'sini URL'den çıkar
    const videoId = extractVideoId(ad.video_url, ad.video_platform);

    const { data, error } = await supabase
      .from('business_ads')
      .insert({
        ...ad,
        video_id: videoId,
        budget_remaining: ad.budget_total,
        status: 'pending', // Admin onayına gidecek
      })
      .select()
      .single();

    if (error) throw error;

    Alert.alert(
      'Reklam Oluşturuldu',
      'Reklamınız admin onayına gönderildi. Onaylandıktan sonra yayınlanacak.'
    );

    return data.id;
  } catch (error) {
    console.error('Reklam oluşturulamadı:', error);
    Alert.alert('Hata', 'Reklam oluşturulamadı.');
    throw error;
  }
}

/**
 * 6. VIDEO ID ÇIKARMA (YouTube, Instagram, Facebook)
 */
function extractVideoId(url: string, platform: string): string | null {
  try {
    if (platform === 'youtube') {
      // https://www.youtube.com/watch?v=VIDEO_ID
      // https://youtu.be/VIDEO_ID
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      return match ? match[1] : null;
    } else if (platform === 'instagram') {
      // https://www.instagram.com/reel/VIDEO_ID/
      // https://www.instagram.com/p/POST_ID/
      const match = url.match(/instagram\.com\/(reel|p)\/([^/\s]+)/);
      return match ? match[2] : null;
    } else if (platform === 'facebook') {
      // https://www.facebook.com/watch/?v=VIDEO_ID
      const match = url.match(/facebook\.com\/watch\/\?v=(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  } catch (error) {
    console.error('Video ID çıkarılamadı:', error);
    return null;
  }
}

/**
 * 7. İŞLETME REKLAM İSTATİSTİKLERİ
 */
export async function getBusinessAdStats(): Promise<AdStats[]> {
  try {
    const { data, error } = await supabase
      .from('business_ad_stats')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('İstatistikler alınamadı:', error);
    return [];
  }
}

/**
 * 8. ADMIN ONAY KUYRUĞU
 */
export async function getAdminReviewQueue(): Promise<any[]> {
  try {
    // Sadece admin görebilir
    const { data: user } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('auth_user_id', user.user?.id)
      .single();

    if (profile?.email !== 'ejderha112@gmail.com') {
      throw new Error('Sadece admin erişebilir');
    }

    const { data, error } = await supabase
      .from('admin_ad_review_dashboard')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Onay kuyruğu alınamadı:', error);
    return [];
  }
}

/**
 * 9. ADMIN REKLAM ONAY/RED
 */
export async function adminApproveAd(
  adId: string,
  approved: boolean,
  rejectionReason?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('admin_approve_ad', {
      p_ad_id: adId,
      p_approved: approved,
      p_rejection_reason: rejectionReason,
    });

    if (error) throw error;

    Alert.alert(
      'Başarılı',
      approved ? 'Reklam onaylandı' : 'Reklam reddedildi'
    );

    return true;
  } catch (error) {
    console.error('Onay işlemi başarısız:', error);
    Alert.alert('Hata', 'Onay işlemi gerçekleştirilemedi.');
    return false;
  }
}

/**
 * 10. PLATFORM KAZANÇ RAPORU (ADMIN)
 */
export async function getPlatformRevenueReport(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('platform_revenue_report')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Kazanç raporu alınamadı:', error);
    return [];
  }
}

/**
 * 11. REKLAM BUTÇE YÜKLEME
 */
export async function loadAdBudget(
  businessId: string,
  adId: string,
  amount: number,
  paymentMethod: 'credit_card' | 'bank_transfer'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('ad_payments')
      .insert({
        business_id: businessId,
        ad_id: adId,
        amount: amount,
        payment_method: paymentMethod,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    Alert.alert(
      'Ödeme Alındı',
      `${amount} TL bütçe yükleme işleminiz alındı. Onaylandıktan sonra reklamınız yayınlanacak.`
    );

    return true;
  } catch (error) {
    console.error('Bütçe yüklenemedi:', error);
    Alert.alert('Hata', 'Bütçe yükleme başarısız.');
    return false;
  }
}

/**
 * 12. VIDEO OYNATICI URL DÖNÜŞÜMÜ
 */
export function getEmbedUrl(videoUrl: string, platform: string): string {
  const videoId = extractVideoId(videoUrl, platform);

  if (!videoId) return videoUrl;

  switch (platform) {
    case 'youtube':
      return `https://www.youtube.com/embed/${videoId}`;
    case 'instagram':
      return `https://www.instagram.com/p/${videoId}/embed`;
    case 'facebook':
      return `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/watch/?v=${videoId}`;
    default:
      return videoUrl;
  }
}

/**
 * KULLANIM ÖRNEKLERİ:
 * 
 * // 1. Haritada yakındaki reklamları getir
 * const ads = await getNearbyBusinessAds(38.4192, 27.1287, 5000);
 * 
 * // 2. Reklam ekranda göründüğünde
 * await recordAdImpression(ad.ad_id, userLat, userLng);
 * 
 * // 3. Reklam tıklandığında
 * const result = await recordAdClick(ad.ad_id, userLat, userLng);
 * if (result.success && result.businessUrl) {
 *   Linking.openURL(result.businessUrl);
 * }
 * 
 * // 4. İşletme kaydı oluştur
 * const businessId = await createBusinessProfile({
 *   business_name: 'Kahve Deryası',
 *   business_type: 'cafe',
 *   latitude: 38.4192,
 *   longitude: 27.1287,
 *   address: 'İzmir Şehir Hastanesi Karşısı',
 *   phone: '0232 123 45 67',
 *   email: 'info@kahvederyasi.com',
 *   instagram_url: 'https://instagram.com/kahvederyasi',
 * });
 * 
 * // 5. Video reklam oluştur
 * const adId = await createBusinessAd({
 *   business_id: businessId,
 *   title: 'Yeni Latte Çeşitlerimiz',
 *   description: 'Özel tariflerimizle hazırlanan latteler',
 *   video_platform: 'youtube',
 *   video_url: 'https://www.youtube.com/watch?v=ABC123',
 *   budget_total: 500,
 *   target_radius_meters: 2000,
 * });
 * 
 * // 6. Admin onay
 * await adminApproveAd(adId, true);
 */
