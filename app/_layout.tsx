import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import 'react-native-url-polyfill/auto';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Platform spesifik başlatma optimizasyonları
    if (Platform.OS === 'web') {
      // Web için ek optimizasyonlar
      console.log('Web platform başlatıldı');
    }
  }, []);
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
