import { supabase } from './supabase';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';

export class AuthService {
  async signInWithGoogle() {
    try {
      const redirectUrl = AuthSession.makeRedirectUri({
        useProxy: true,
      });

      const authUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;

      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: redirectUrl,
      });

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;
          return data;
        }
      }

      throw new Error('Google girişi başarısız');
    } catch (error) {
      console.error('Google giriş hatası:', error);
      throw error;
    }
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }
}