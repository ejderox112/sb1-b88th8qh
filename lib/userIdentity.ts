// userIdentity.ts
// Görev 50: Kullanıcı kodu üretimi + nickname kontrolü + mail tekilliği

import { supabase } from './supabaseClient';

export function generateUserCode(): string {
  // 9 haneli özel kullanıcı kodu üretimi
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

export async function isNicknameAvailable(nickname: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname)
    .maybeSingle();

  return !data;
}

export async function isEmailUnique(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  return !data;
}