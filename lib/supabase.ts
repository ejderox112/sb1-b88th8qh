import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants?.expoConfig?.extra ?? (Constants as any)?.manifestExtra ?? {}) as Record<string, any>;

// Expo Constants veya derleme zamanlı env değişkenleri üzerinden Supabase yapılandırmasını oku
const supabaseUrl =
  extra.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'Missing');
console.log('Supabase Key:', supabaseAnonKey ? 'Configured' : 'Missing');

// Create a mock client if credentials are not available
export const supabase = isSupabaseConfigured 
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