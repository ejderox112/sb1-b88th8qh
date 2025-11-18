import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAutoAuth() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // Mevcut kullanıcıyı kontrol et
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        console.log('Mevcut kullanıcı bulundu:', currentUser.id);
        setUser(currentUser);
        await ensureProfile(currentUser.id, currentUser.email);
        setIsReady(true);
        return;
      }

      // Kullanıcı yoksa demo user oluştur (Supabase'e bağlanmadan)
      console.log('Kullanıcı bulunamadı, demo mod başlatılıyor...');
      const demoUserId = `demo-${Date.now()}`;
      const demoEmail = `user_${Date.now()}@demo.local`;
      
      setUser({
        id: demoUserId,
        email: demoEmail,
        user_metadata: {},
      } as any);
      
      // Demo profil oluştur
      await createDemoProfile(demoUserId, demoEmail);
      setIsReady(true);
    } catch (err) {
      console.error('Auth hatası:', err);
      setIsReady(true);
    }
  };

  const ensureProfile = async (userId: string, email: string) => {
    try {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        console.log('Profil mevcut');
        return;
      }

      console.log('Profil oluşturuluyor...');
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: email,
          username: `kullanici_${userId.substring(0, 8)}`,
          nickname: `Kullanıcı ${Math.floor(Math.random() * 1000)}`,
          level: 1,
          xp: 0,
          user_code: `U${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        });

      if (error) {
        console.error('Profil oluşturma hatası:', error);
      } else {
        console.log('Profil başarıyla oluşturuldu');
      }
    } catch (err) {
      console.error('ensureProfile hatası:', err);
    }
  };

  const createDemoProfile = async (userId: string, email: string) => {
    try {
      console.log('Demo profil oluşturuluyor...');
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: email,
          username: `kullanici_${userId.substring(0, 8)}`,
          nickname: `Demo Kullanıcı ${Math.floor(Math.random() * 1000)}`,
          level: 5,
          xp: 500,
          user_code: `D${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        });

      if (error) {
        console.error('Demo profil oluşturma hatası:', error);
      } else {
        console.log('Demo profil başarıyla oluşturuldu');
      }
    } catch (err) {
      console.error('createDemoProfile hatası:', err);
    }
  };

  return { isReady, user };
}
