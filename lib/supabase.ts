import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants?.expoConfig?.extra ?? (Constants as any)?.manifestExtra ?? {}) as Record<string, any>;

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  // Trim and remove surrounding quotes like "..." or '...'
  return value.trim().replace(/^['"]+|['"]+$/g, '');
};

const normalizeSupabaseUrl = (rawUrl: unknown): string => {
  let url = normalizeString(rawUrl);
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};

// Expo Constants veya derleme zamanlı env değişkenleri üzerinden Supabase yapılandırmasını oku
const supabaseUrl = normalizeSupabaseUrl(
	extra.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
);

const supabaseAnonKey = normalizeString(
	extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

let supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'Missing');
console.log('Supabase Key:', supabaseAnonKey ? 'Configured' : 'Missing');

// Create a mock client if credentials are not available
const mockSupabase = {
	auth: {
		signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
		signUp: async () => ({ data: null, error: new Error('Supabase not configured') }),
		signOut: async () => ({ error: new Error('Supabase not configured') }),
		getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
		onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
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

let supabaseClient: any = mockSupabase;

if (supabaseConfigured) {
	try {
		supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
			auth: {
				autoRefreshToken: true,
				persistSession: true,
			},
		});
	} catch (error) {
		console.warn('Supabase config invalid; falling back to mock client');
		supabaseConfigured = false;
		supabaseClient = mockSupabase;
	}
}

export const isSupabaseConfigured = supabaseConfigured;
export const supabase = supabaseClient;