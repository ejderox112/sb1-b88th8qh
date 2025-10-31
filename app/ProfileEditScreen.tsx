import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Picker } from 'react-native';
import { supabase } from '../lib/supabase';
import { canChangeGender } from '../lib/genderUtils';

const AVATARS = ['Erkek', 'Kadın', 'Belirtilmemiş', 'Bozuk Cinsiyet'];

export default function ProfileEditScreen() {
  const [profile, setProfile] = useState(null);
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [avatar, setAvatar] = useState('');
  const [nickname, setNickname] = useState('');
  const [showGender, setShowGender] = useState(true);
  const [showAge, setShowAge] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.data.user.id)
      .single();
    setProfile(data);
    setGender(data.gender);
    setAge(data.age?.toString());
    setAvatar(data.avatar);
    setNickname(data.nickname);
    setShowGender(data.show_gender);
    setShowAge(data.show_age);
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

    await supabase.from('gender_change_log').insert({
      user_id: profile.id,
      old_gender: profile.gender,
      new_gender,
      changed_at: new Date().toISOString(),
    });

    await supabase
      .from('profiles')
      .update({
        gender: newGender,
        gender_change_count: profile.gender_change_count + 1,
        last_gender_change: new Date().toISOString(),
        requires_gender_approval: false,
      })
      .eq('id', profile.id);

    setGender(newGender);
    Alert.alert('Cinsiyet güncellendi');
  };

  const saveProfile = async () => {
    await supabase
      .from('profiles')
      .update({
        age: parseInt(age),
        avatar,
        nickname,
        show_gender: showGender,
        show_age: showAge,
      })
      .eq('id', profile.id);
    Alert.alert('Profil güncellendi');
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
      <Picker selectedValue={avatar} onValueChange={setAvatar}>
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