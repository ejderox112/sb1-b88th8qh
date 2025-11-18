import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Picker } from 'react-native';
import { supabase } from '../lib/supabase';
import { canChangeGender } from '../lib/genderUtils';

const AVATARS = ['Erkek', 'Kadın', 'Belirtilmemiş', 'Bozuk Cinsiyet'];

export default function ProfileEditScreen() {
  const [profile, setProfile] = useState(null);
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nickname, setNickname] = useState('');
  const [showGender, setShowGender] = useState(true);
  const [showAge, setShowAge] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user?.data?.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('fetchProfile error:', error);
        return;
      }

      setProfile(data);
      setGender(data.gender);
      setAge(data.age?.toString());
      setAvatarUrl(data.avatar_url || data.avatar || '');
      setNickname(data.nickname);
      setShowGender(data.show_gender);
      setShowAge(data.show_age);
    } catch (err) {
      console.error('fetchProfile catch:', err);
    }
  };

  const handleGenderChange = async newGender => {
    const result = canChangeGender(profile.last_gender_change, profile.gender_change_count);
    if (!result.allowed) {
      Alert.alert('Cinsiyet Değişimi Engellendi', result.reason);
      if (profile.gender_change_count >= 3) {
        await supabase
          .from('profiles')
          .update({ requires_gender_approval: true, xp: profile.xp - 200 })
          .eq('id', profile.id);
      }
      return;
    }

    try {
      await supabase.from('gender_change_log').insert({
        user_id: profile.id,
        old_gender: profile.gender,
        new_gender,
        changed_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('gender change log insert error:', err);
    }

    try {
      await supabase
        .from('user_profiles')
        .update({
          gender: newGender,
          gender_change_count: profile.gender_change_count + 1,
          last_gender_change: new Date().toISOString(),
          requires_gender_approval: false,
        })
        .eq('id', profile.id);
    } catch (err) {
      console.error('gender update error:', err);
    }

    setGender(newGender);
    Alert.alert('Cinsiyet güncellendi');
  };

  const saveProfile = async () => {
    try {
      const updates: any = {
        age: Number.isNaN(parseInt(age)) ? null : parseInt(age),
        avatar_url: avatarUrl,
        nickname,
        show_gender: showGender,
        show_age: showAge,
      };

      await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile.id);

      Alert.alert('Profil güncellendi');
    } catch (err) {
      console.error('saveProfile error:', err);
      Alert.alert('Profil kaydedilirken hata oluştu');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 Profil Düzenle</Text>

      <Text>Nickname:</Text>
      <TextInput value={nickname} onChangeText={setNickname} style={styles.input} />

      <Text>Yaş:</Text>
      <TextInput value={age} onChangeText={setAge} keyboardType="numeric" style={styles.input} />

      <Text>Cinsiyet:</Text>
      <Picker selectedValue={gender} onValueChange={handleGenderChange}>
        <Picker.Item label="Erkek" value="Erkek" />
        <Picker.Item label="Kadın" value="Kadın" />
        <Picker.Item label="Belirtilmemiş" value="Belirtilmemiş" />
        <Picker.Item label="Bozuk Cinsiyet" value="Bozuk Cinsiyet" />
      </Picker>

      <Text>Avatar:</Text>
      <Picker selectedValue={avatarUrl} onValueChange={setAvatarUrl}>
        {AVATARS.map(a => (
          <Picker.Item key={a} label={a} value={a} />
        ))}
      </Picker>

      <View style={styles.switchRow}>
        <Text>Cinsiyet Görünsün</Text>
        <Button title={showGender ? 'Açık' : 'Kapalı'} onPress={() => setShowGender(!showGender)} />
      </View>

      <View style={styles.switchRow}>
        <Text>Yaş Görünsün</Text>
        <Button title={showAge ? 'Açık' : 'Kapalı'} onPress={() => setShowAge(!showAge)} />
      </View>

      <Button title="Kaydet" onPress={saveProfile} />
      <Text style={styles.code}>Kullanıcı Kodu: {profile?.user_code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, padding: 8, marginVertical: 5 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  code: { marginTop: 20, fontStyle: 'italic', color: '#888' },
});