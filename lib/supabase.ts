import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Expo Constants üzerinden env değişkenlerini oku
const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || 
                    process.env.EXPO_PUBLIC_SUPABASE_URL || 
                    '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                        '';

console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'Missing');
console.log('Supabase Key:', supabaseAnonKey ? 'Configured' : 'Missing');

// Create a mock client if credentials are not available
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : {
      auth: {
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signUp: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: new Error('Supabase not configured') }),
        getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }), // Mock onAuthStateChange
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: new Error('Supabase not configured') }),
            order: async () => ({ data: [], error: new Error('Supabase not configured') }),
          }),
          order: async () => ({ data: [], error: new Error('Supabase not configured') }),
        }),
        insert: async () => ({ error: new Error('Supabase not configured') }),
        update: () => ({
          eq: async () => ({ error: new Error('Supabase not configured') }),
        }),
      }),
    } as any;