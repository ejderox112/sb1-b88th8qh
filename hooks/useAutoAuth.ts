import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useAutoAuth() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      if (!isSupabaseConfigured) {
        console.warn('useAutoAuth: Supabase yapılandırılmadı, kullanıcı oturumu başlatılmayacak.');
        setIsReady(true);
        setUser(null);
        return;
      }

      // Mevcut kullanıcıyı kontrol et
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        console.log('Mevcut kullanıcı bulundu:', currentUser.id);
        setUser(currentUser);
        // Profil oluşturma işlemini arka planda yap
        ensureProfile(currentUser.id, currentUser.email || '', currentUser.user_metadata?.full_name || '').catch(err => {
          console.error('Profil oluşturma hatası:', err);
        });
        setIsReady(true);
        return;
      }

      console.log('Oturum bulunamadı. Kullanıcıyı giriş ekranına yönlendirin.');
      setUser(null);
      setIsReady(true);
    } catch (err) {
      console.error('Auth hatası:', err);
      setIsReady(true);
    }
  };

  const ensureProfile = async (userId: string, email: string, fullName?: string) => {
    try {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log('Profil zaten mevcut:', userId);
        return;
      }

      console.log('Yeni profil oluşturuluyor...', userId);
      const username = email?.split('@')[0] || `kullanici_${userId.substring(0, 8)}`;
      
      // Admin email kontrolü ve özel nickname ataması
      const adminEmails = ['ejderha112@gmail.com'];
      const isAdmin = email && adminEmails.includes(email.toLowerCase());
      const nickname = isAdmin ? 'SeekMap' : (fullName || `Kullanıcı ${Math.floor(Math.random() * 1000)}`);
      
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: email,
          username: username,
          nickname: nickname,
          level: isAdmin ? 99 : 1,
          xp: isAdmin ? 999999 : 0,
          trust_score: isAdmin ? 100 : 50,
          user_code: `U${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          nickname_locked: isAdmin,
          can_bypass_photo_limit: isAdmin,
        });

      if (error) {
        console.error('Profil oluşturma hatası:', error);
      } else {
        console.log('Profil başarıyla oluşturuldu:', userId);
      }
    } catch (err) {
      console.error('ensureProfile hatası:', err);
    }
  };

  return { isReady, user };
}
