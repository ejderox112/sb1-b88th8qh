import { supabase } from './supabase';

export interface PhotoUploadLimit {
  userId: string;
  todayCount: number;
  canUpload: boolean;
  remainingToday: number;
}

const MAX_PHOTOS_PER_DAY = 5;

/**
 * Kullanıcının bugün kaç fotoğraf yüklediğini kontrol eder
 */
export async function checkPhotoUploadLimit(userId: string): Promise<PhotoUploadLimit> {
  try {
    // Bypass kontrolü - admin veya özel yetkili kullanıcılar
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('can_bypass_photo_limit')
      .eq('id', userId)
      .single();

    if (profile?.can_bypass_photo_limit) {
      return {
        userId,
        todayCount: 0,
        canUpload: true,
        remainingToday: 999,
      };
    }

    // Bugünün başlangıç tarihini hesapla
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('user_photo_uploads')
      .select('id')
      .eq('user_id', userId)
      .gte('uploaded_at', today.toISOString());

    if (error) throw error;

    const todayCount = data?.length || 0;
    const canUpload = todayCount < MAX_PHOTOS_PER_DAY;
    const remainingToday = Math.max(0, MAX_PHOTOS_PER_DAY - todayCount);

    return {
      userId,
      todayCount,
      canUpload,
      remainingToday,
    };
  } catch (err) {
    console.error('Photo upload limit check error:', err);
    return {
      userId,
      todayCount: 0,
      canUpload: false,
      remainingToday: 0,
    };
  }
}

/**
 * Fotoğraf dosya tipini kontrol eder - sadece JPG/JPEG kabul edilir
 */
export function validatePhotoFile(file: File | { uri: string; type?: string }): { valid: boolean; error?: string } {
  // Web File object
  if ('type' in file && typeof file.type === 'string') {
    const validTypes = ['image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      return { valid: false, error: 'Sadece JPG/JPEG formatı kabul edilir' };
    }
    return { valid: true };
  }

  // React Native URI object
  if ('uri' in file && file.uri) {
    const uri = file.uri.toLowerCase();
    if (!uri.endsWith('.jpg') && !uri.endsWith('.jpeg')) {
      return { valid: false, error: 'Sadece JPG/JPEG formatı kabul edilir' };
    }
    return { valid: true };
  }

  return { valid: false, error: 'Geçersiz dosya formatı' };
}

/**
 * Fotoğraf yüklemesini kaydeder
 */
export async function recordPhotoUpload(
  userId: string,
  photoUrl: string,
  location?: { latitude: number; longitude: number },
  metadata?: { roomName?: string; buildingId?: string; floorId?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!location) {
      return { success: false, error: 'Konum bilgisi gereklidir' };
    }

    const { error } = await supabase.from('user_photo_uploads').insert({
      user_id: userId,
      photo_url: photoUrl,
      latitude: location.latitude,
      longitude: location.longitude,
      room_name: metadata?.roomName,
      building_id: metadata?.buildingId,
      floor_id: metadata?.floorId,
      uploaded_at: new Date().toISOString(),
    });

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Photo upload recording error:', err);
    return { success: false, error: err.message || 'Kayıt hatası' };
  }
}
