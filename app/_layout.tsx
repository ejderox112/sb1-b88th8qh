import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function Layout() {
  useEffect(() => {
    // Web için console error handler
    if (Platform.OS === 'web') {
      console.log('App loaded on web');
    }
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}