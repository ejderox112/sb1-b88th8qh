// Business Ad Service - Reklam Yönetimi + İstatistikler
import { supabase } from './supabase';

// Reklam oluşturma (işletme sahipleri için)
export const createBusinessAd = async (adData: {
  businessId: string;
  title: string;
  description: string;
  videoPlatform: 'youtube' | 'instagram' | 'facebook';
  videoUrl: string;
  budgetTotal: number;
  targetRadius: number;
}) => {
  try {
    const { data, error } = await supabase
      .from('business_ads')
      .insert({
        business_id: adData.businessId,
        title: adData.title,
        description: adData.description,
        video_platform: adData.videoPlatform,
        video_url: adData.videoUrl,
        budget_total: adData.budgetTotal,
        budget_remaining: adData.budgetTotal,
        status: 'pending', // Admin onayı bekliyor
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Reklam oluşturma hatası:', error);
    return { success: false, error: error.message };
  }
};

// Reklam izleme kaydı (5sn skip + XP sistemi)
export const recordAdView = async (
  adId: string,
  watchDuration: number, // saniye
  skipped: boolean,
  userLocation?: { latitude: number; longitude: number }
) => {
  try {
    const { data, error } = await supabase.rpc('record_ad_view_with_skip', {
      p_ad_id: adId,
      p_watch_duration: watchDuration,
      p_skipped: skipped,
      p_user_latitude: userLocation?.latitude,
      p_user_longitude: userLocation?.longitude,
    });

    if (error) throw error;
    return data; // { success, xp_earned, watch_duration, distance_meters }
  } catch (error: any) {
    console.error('Reklam izleme kaydı hatası:', error);
    return { success: false, error: error.message };
  }
};

// Reklam tıklama kaydı (0.50 TL maliyet)
export const recordAdClick = async (adId: string) => {
  try {
    const { data, error } = await supabase.rpc('record_ad_impression', {
      p_ad_id: adId,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Reklam tıklama hatası:', error);
    return { success: false, error: error.message };
  }
};

// Yakındaki reklamları getir
export const getNearbyAds = async (
  latitude: number,
  longitude: number,
  maxDistance: number = 5000 // 5km
) => {
  try {
    const { data, error } = await supabase.rpc('get_nearby_ads', {
      p_user_lat: latitude,
      p_user_lng: longitude,
      p_max_distance: maxDistance,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Reklam getirme hatası:', error);
    return { success: false, error: error.message };
  }
};

// İşletme profili oluşturma
export const createBusinessProfile = async (profileData: {
  businessName: string;
  description: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Giriş yapmalısınız');

    const { data, error } = await supabase
      .from('business_profiles')
      .insert({
        owner_id: user.id,
        business_name: profileData.businessName,
        description: profileData.description,
        category: profileData.category,
        address: profileData.address,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        phone: profileData.phone,
        email: profileData.email,
        website: profileData.website,
        logo_url: profileData.logoUrl,
        ad_radius_meters: 5000, // Varsayılan 5km
        cost_per_impression: 0.10,
        cost_per_click: 0.50,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('İşletme profili oluşturma hatası:', error);
    return { success: false, error: error.message };
  }
};

// Reklam istatistikleri (işletme sahipleri için)
export const getAdStatistics = async (adId: string) => {
  try {
    const { data, error } = await supabase
      .from('ad_performance_analysis')
      .select('*')
      .eq('ad_id', adId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Reklam istatistikleri hatası:', error);
    return { success: false, error: error.message };
  }
};

// Premium satın alma
export const purchaseSubscription = async (
  tier: 'premium' | 'prestij' | 'premium_plus',
  durationMonths: number = 1
) => {
  try {
    const { data, error } = await supabase.rpc('purchase_subscription', {
      p_tier: tier,
      p_duration_months: durationMonths,
      p_payment_method: 'credit_card',
    });

    if (error) throw error;
    return data; // { success, transaction_id, tier, amount, start_date, end_date }
  } catch (error: any) {
    console.error('Abonelik satın alma hatası:', error);
    return { success: false, error: error.message };
  }
};

// Rütbe atlama (500 TL ile bir üst rütbeye geç)
export const skipToNextRank = async () => {
  try {
    const { data, error } = await supabase.rpc('skip_to_next_rank');
    if (error) throw error;
    return data; // { success, old_rank, new_rank, amount_paid }
  } catch (error: any) {
    console.error('Rütbe atlama hatası:', error);
    return { success: false, error: error.message };
  }
};

// Pornografik içerik bildirimi
export const reportInappropriateContent = async (
  contentType: 'message' | 'photo' | 'profile' | 'ad',
  contentId: string,
  reportedUserId: string,
  description?: string,
  evidenceUrls?: string[]
) => {
  try {
    const { data, error } = await supabase.rpc('report_inappropriate_content', {
      p_content_type: contentType,
      p_content_id: contentId,
      p_reported_user_id: reportedUserId,
      p_report_type: 'pornographic',
      p_description: description,
      p_evidence_urls: evidenceUrls,
    });

    if (error) throw error;
    return data; // { success, report_id, message, admin_notified }
  } catch (error: any) {
    console.error('İçerik bildirimi hatası:', error);
    return { success: false, error: error.message };
  }
};

// Indoor fotoğraf yükleme
export const uploadIndoorPhoto = async (
  locationId: string,
  floorNumber: number,
  photoUrl: string,
  userLocation: { latitude: number; longitude: number; altitude?: number },
  photoLocation?: { latitude?: number; longitude?: number },
  indoorCoords?: { x?: number; y?: number },
  poiType: string = 'room',
  label?: string
) => {
  try {
    const { data, error } = await supabase.rpc('upload_indoor_photo', {
      p_location_id: locationId,
      p_floor_number: floorNumber,
      p_photo_url: photoUrl,
      p_user_lat: userLocation.latitude,
      p_user_lng: userLocation.longitude,
      p_user_altitude: userLocation.altitude,
      p_photo_lat: photoLocation?.latitude,
      p_photo_lng: photoLocation?.longitude,
      p_indoor_x: indoorCoords?.x,
      p_indoor_y: indoorCoords?.y,
      p_poi_type: poiType,
      p_label: label,
    });

    if (error) throw error;
    return data; // { success, photo_id, xp_earned, moderation_status }
  } catch (error: any) {
    console.error('Fotoğraf yükleme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Günlük giriş XP
export const awardDailyLoginXP = async () => {
  try {
    const { error } = await supabase.rpc('award_daily_login_xp');
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Günlük giriş XP hatası:', error);
    return { success: false, error: error.message };
  }
};
