import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function Layout() {
  // Basit yükleme logu
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('App loaded on web');
    }
  }, []);

  // Global web auth fallback: /--/expo-auth-session hash içinden id_token yakala
  const fallbackTried = useRef(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (fallbackTried.current) return;
    fallbackTried.current = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) return; // zaten girişli
        const loc = window.location;
        const hasAuthPath = loc.pathname === '/--/expo-auth-session';
        if ((hasAuthPath || loc.hash.includes('id_token=')) && loc.hash) {
          const params = new URLSearchParams(loc.hash.substring(1));
          const idToken = params.get('id_token');
          if (idToken) {
            console.log('[GLOBAL AUTH FALLBACK] id_token bulundu, Supabase giriş denemesi');
            const res = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
            if (res.error) {
              console.error('[GLOBAL AUTH FALLBACK] Supabase giriş hatası:', res.error.message);
            } else {
              console.log('[GLOBAL AUTH FALLBACK] Supabase giriş başarılı');
              
              // Eğer popup içindeysek (window.opener varsa), ana pencereyi yenile ve popup'ı kapat
              if (window.opener) {
                console.log('[GLOBAL AUTH FALLBACK] Popup tespit edildi, ana pencere yenileniyor...');
                try {
                  // Session'ın storage'a yazılması için kısa bir bekleme
                  setTimeout(() => {
                    window.opener.location.reload(); 
                    window.close(); 
                  }, 1000);
                  return;
                } catch (e) {
                  console.warn('Ana pencereye erişilemedi:', e);
                }
              }

              // Popup değilse (veya kapatılamadıysa), aynı pencerede yönlendir
              try {
                // Ana sayfaya yönlendir (Tabların görünmesi için)
                window.location.href = '/';
              } catch {}
            }
          }
        }
      } catch (e:any) {
        console.warn('[GLOBAL AUTH FALLBACK] hata:', e?.message || e);
      }
    })();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}