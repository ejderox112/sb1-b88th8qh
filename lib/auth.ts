import { supabase } from './supabase';
import { Platform } from 'react-native';

export class AuthService {
  async signInWithGoogle() {
    try {
      // Web platformu için basit email/password girişi
      if (Platform.OS === 'web') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'demo@example.com',
          password: 'demo123456',
        });
        
        if (error) {
          // Kullanıcı yoksa oluştur
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'demo@example.com',
            password: 'demo123456',
          });
          
          if (signUpError) throw signUpError;
          return signUpData;
        }
        
        return data;
      } else {
        // Native platformlar için Google OAuth (şimdilik basit giriş)
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'demo@example.com',
          password: 'demo123456',
        });
        
        if (error) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'demo@example.com',
            password: 'demo123456',
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
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }
}