import { supabase } from './supabase';
import { Platform } from 'react-native';

export class AuthService {
  private static instance: AuthService | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async signInWithGoogle() {
    try {
      // Check if Supabase is properly configured
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        // Return mock user data for demo purposes
        return {
          data: {
            user: {
              id: 'demo-user-123',
              email: 'demo@example.com',
              user_metadata: {
                full_name: 'Demo User',
              },
            },
          },
          error: null,
        };
      }

      // Web platformu için basit email/password girişi
      if (Platform.OS === 'web') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'test123456',
        });
        
        if (error) {
          // Kullanıcı yoksa oluştur
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'test@example.com',
            password: 'test123456',
          });
          
          if (signUpError) throw signUpError;
          return signUpData;
        }
        
        return data;
      } else {
        // Native platformlar için Google OAuth (şimdilik basit giriş)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'test123456',
        });
        
        if (error) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'test@example.com',
            password: 'test123456',
          });
          
          if (signUpError) throw signUpError;
          return signUpData;
        }
        
        return data;
      }
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
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        // Return mock user for demo
        return {
          id: 'demo-user-123',
          email: 'demo@example.com',
          user_metadata: {
            full_name: 'Demo User',
          },
        };
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