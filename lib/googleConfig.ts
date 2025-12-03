import Constants from 'expo-constants';
import { Platform } from 'react-native';

type GoogleConfig = {
  webClientId?: string | null;
  androidClientId?: string | null;
  iosClientId?: string | null;
};

const extra = (Constants.expoConfig && (Constants.expoConfig as any).extra) || {};

export function getGoogleConfig(): GoogleConfig {
  return {
    webClientId:
      (extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as string) ??
      (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as string) ??
      null,
    androidClientId:
      (extra.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID as string) ??
      (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID as string) ??
      null,
    iosClientId:
      (extra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID as string) ??
      (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID as string) ??
      null,
  };
}

export function getClientIdForPlatform(): string | null {
  const cfg = getGoogleConfig();
  if (Platform.OS === 'android') return cfg.androidClientId ?? null;
  if (Platform.OS === 'ios') return cfg.iosClientId ?? cfg.webClientId ?? null;
  return cfg.webClientId ?? null;
}
