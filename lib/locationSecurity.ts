// locationSecurity.ts
// Görev 49–50: Sahte konum tespiti + izlenim modu kontrolü

import { Platform } from 'react-native';
import * as Location from 'expo-location';

export async function verifyLocation(): Promise<{ isReal: boolean; reason?: string }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { isReal: false, reason: 'Konum izni verilmedi' };
    }

    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

    // Sahte konum tespiti için bazı cihazlarda mock location kontrolü yapılabilir
    if (Platform.OS === 'android' && location.mocked) {
      return { isReal: false, reason: 'Sahte konum tespit edildi (mocked)' };
    }

    return { isReal: true };
  } catch (error) {
    return { isReal: false, reason: 'Konum alınamadı' };
  }
}

export function isInImpressionMode(locationEnabled: boolean, userEnteredManually: boolean): boolean {
  // Kullanıcı konum paylaşmıyorsa veya fiziksel olarak mekânda değilse izlenim modundadır
  return !locationEnabled || userEnteredManually;
}