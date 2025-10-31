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

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      supabase.auth.signInWithIdToken({
        provider: 'google',
        token: authentication.idToken,
      });
    }
  }, [response]);

  const saveProfile = async () => {
    const user = await supabase.auth.getUser();
    await supabase.from('profiles').upsert({
      id: user.data.user.id,
      nickname,
      gender,
      age,
    });
  };

  return (
    <View>
      <Button title="Google ile Giriş Yap" onPress={() => promptAsync()} />
      <TextInput placeholder="Nickname" onChangeText={setNickname} />
      <TextInput placeholder="Cinsiyet" onChangeText={setGender} />
      <TextInput placeholder="Yaş" onChangeText={setAge} keyboardType="numeric" />
      <Button title="Profili Kaydet" onPress={saveProfile} />
    </View>
  );
}