// app/(auth)/AuthScreen.tsx
import { useState, useEffect } from 'react';
import { View, Button, TextInput } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { supabase } from '../lib/supabase'; // Supabase client

export default function AuthScreen() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'GOOGLE_EXPO_CLIENT_ID',
  });
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const user = await supabase.auth.getUser();
      setIsGuest(!user?.data?.user?.id);
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      supabase.auth.signInWithIdToken({
        provider: 'google',
        token: authentication.idToken,
      }).then(() => {
        setIsGuest(false);
        setInfoMsg('Giriş başarılı!');
        setErrorMsg('');
      }).catch(e => {
        setErrorMsg('Google ile giriş başarısız: ' + e.message);
      });
    }
  }, [response]);

  const saveProfile = async () => {
    if (!nickname.trim() || !gender.trim() || !age.trim()) {
      setErrorMsg('Tüm alanları doldurun.');
      return;
    }
    try {
      const user = await supabase.auth.getUser();
      if (!user?.data?.user?.id) {
        setErrorMsg('Kayıt için önce giriş yapmalısınız.');
        return;
      }
      await supabase.from('profiles').upsert({
        id: user.data.user.id,
        nickname,
        gender,
        age,
      });
      setInfoMsg('Profil başarıyla kaydedildi.');
      setErrorMsg('');
    } catch (e) {
      setErrorMsg('Profil kaydedilemedi: ' + (e.message || e));
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title="Google ile Giriş Yap" onPress={() => promptAsync()} />
      {isGuest ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: '#888', fontStyle: 'italic' }}>Misafir olarak giriş yaptınız. Profil oluşturmak için önce Google ile giriş yapın.</Text>
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <TextInput placeholder="Nickname" value={nickname} onChangeText={setNickname} style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 }} />
          <TextInput placeholder="Cinsiyet" value={gender} onChangeText={setGender} style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 }} />
          <TextInput placeholder="Yaş" value={age} onChangeText={setAge} keyboardType="numeric" style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 }} />
          <Button title="Profili Kaydet" onPress={saveProfile} />
        </View>
      )}
      {errorMsg ? <Text style={{ color: 'red', marginTop: 12 }}>{errorMsg}</Text> : null}
      {infoMsg ? <Text style={{ color: 'green', marginTop: 8 }}>{infoMsg}</Text> : null}
    </View>
  );
}