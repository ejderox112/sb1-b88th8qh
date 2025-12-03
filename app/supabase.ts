import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Create and export the Supabase client. Do NOT call server-side CLI commands here.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;

