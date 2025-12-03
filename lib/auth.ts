import { supabase } from './supabase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export class AuthService {
  async signInWithGoogle() {
    try {
      // Determine configuration from Expo constants OR environment
      const extra = Constants.expoConfig?.extra || {};
      const supabaseConfigured = !!(
        extra.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
      ) && !!(
        extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
      );

      if (!supabaseConfigured) {
        throw new Error('Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in app config.');
      }

      // For now, we provide a simple email/password sign-in using demo credentials
      // only if they are present in app config. Otherwise the caller should invoke
      // a proper OAuth flow (not handled here).
      const demoEmail = extra.EXPO_PUBLIC_DEMO_EMAIL || process.env.EXPO_PUBLIC_DEMO_EMAIL;
      const demoPassword = extra.EXPO_PUBLIC_DEMO_PASSWORD || process.env.EXPO_PUBLIC_DEMO_PASSWORD;

      if (demoEmail && demoPassword) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        });

        if (error) {
          // Try sign up if not exists
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: demoEmail,
            password: demoPassword,
          });
          if (signUpError) throw signUpError;
          return signUpData;
        }
        return data;
      }

      throw new Error('No demo credentials provided; implement OAuth sign-in flow for Google.');
    } catch (error) {
      console.error('Giriş hatası:', error);
      throw error;
    }
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    try {
      const extra = Constants.expoConfig?.extra || {};
      const supabaseConfigured = !!(
        extra.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
      ) && !!(
        extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
      );

      if (!supabaseConfigured) {
        console.warn('getCurrentUser: Supabase not configured');
        return null;
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('getCurrentUser error:', error);
      return null;
    }
  }
}