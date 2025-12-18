// Client-side resim sıkıştırma (React Native)
// Kullanıcı resim seçtiğinde ÖNCE client'da sıkıştır, SONRA yükle

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export type UploadType = 'avatar' | 'task_photo' | 'venue_photo' | 'blueprint';

interface CompressionConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

// Sıkıştırma stratejileri
const compressionStrategies: Record<UploadType, CompressionConfig> = {
  avatar: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.8,
    format: 'jpeg',
  },
  task_photo: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.75,
    format: 'jpeg',
  },
  venue_photo: {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.8,
    format: 'jpeg',
  },
  blueprint: {
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 0.85,
    format: 'jpeg',
  },
};

/**
 * Resmi sıkıştır ve boyutlandır
 * @param imageUri Orijinal resim URI'si
 * @param uploadType Yükleme tipi (avatar, task_photo, vb.)
 * @returns Sıkıştırılmış resmin URI'si ve boyutu
 */
export async function compressImage(imageUri: string, uploadType: UploadType) {
  const config = compressionStrategies[uploadType];

  try {
    // Orijinal boyutu al
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    const originalSize = (fileInfo as any).size || 0;

    console.log(`📸 Compressing ${uploadType}: ${(originalSize / 1024).toFixed(2)}KB`);

    // Resmi yeniden boyutlandır ve sıkıştır
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: config.maxWidth,
            height: config.maxHeight,
          },
        },
      ],
      {
        compress: config.quality,
        format: ImageManipulator.SaveFormat.JPEG, // WebP React Native'de sınırlı destek
      }
    );

    // Sıkıştırılmış boyutu al
    const compressedInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
    const compressedSize = (compressedInfo as any).size || 0;

    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

    console.log(`✅ Compressed: ${(compressedSize / 1024).toFixed(2)}KB (${compressionRatio}% tasarruf)`);

    return {
      uri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
      originalSize,
      compressedSize,
      compressionRatio: parseFloat(compressionRatio),
    };
  } catch (error) {
    console.error('❌ Compression error:', error);
    throw error;
  }
}

/**
 * Resim yüklemeden önce sıkıştırma kontrolü
 * @param imageUri Resim URI
 * @param uploadType Yükleme tipi
 * @returns Sıkıştırılmış resim bilgileri
 */
export async function prepareImageForUpload(imageUri: string, uploadType: UploadType) {
  // Dosya boyutunu kontrol et
  const fileInfo = await FileSystem.getInfoAsync(imageUri);
  const fileSize = (fileInfo as any).size || 0;

  // Eşik değerleri (bytes)
  const thresholds = {
    avatar: 100 * 1024, // 100KB
    task_photo: 500 * 1024, // 500KB
    venue_photo: 1024 * 1024, // 1MB
    blueprint: 2 * 1024 * 1024, // 2MB
  };

  const threshold = thresholds[uploadType];

  // Eğer dosya zaten küçükse sıkıştırma
  if (fileSize <= threshold) {
    console.log(`✅ File size OK: ${(fileSize / 1024).toFixed(2)}KB, skipping compression`);
    return {
      uri: imageUri,
      originalSize: fileSize,
      compressedSize: fileSize,
      compressionRatio: 0,
    };
  }

  // Dosya büyükse sıkıştır
  return await compressImage(imageUri, uploadType);
}

/**
 * Batch resim sıkıştırma (birden fazla resim için)
 * @param imageUris Resim URI'leri
 * @param uploadType Yükleme tipi
 */
export async function compressImageBatch(imageUris: string[], uploadType: UploadType) {
  const results = [];

  for (const uri of imageUris) {
    try {
      const compressed = await compressImage(uri, uploadType);
      results.push({ success: true, ...compressed });
    } catch (error) {
      results.push({ success: false, uri, error: (error as Error).message });
    }
  }

  return results;
}

/**
 * Kullanım örneği:
 * 
 * import { prepareImageForUpload } from '@/lib/imageCompression';
 * 
 * async function handleImagePick() {
 *   const result = await ImagePicker.launchImageLibraryAsync({
 *     mediaTypes: ImagePicker.MediaTypeOptions.Images,
 *     allowsEditing: true,
 *     aspect: [1, 1],
 *     quality: 1,
 *   });
 * 
 *   if (!result.canceled) {
 *     // ÖNCELİKLE sıkıştır
 *     const compressed = await prepareImageForUpload(result.assets[0].uri, 'avatar');
 *     
 *     // SONRA Supabase'e yükle
 *     const { data, error } = await supabase.storage
 *       .from('avatars')
 *       .upload(`user-${userId}.jpg`, {
 *         uri: compressed.uri,
 *         type: 'image/jpeg',
 *         name: 'avatar.jpg',
 *       });
 *   }
 * }
 */
