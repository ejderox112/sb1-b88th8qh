import { useEffect, useState } from 'react';
import { View, Text, Image, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function UserCustomizationScreen() {
  const [badges, setBadges] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    fetchCustomization();
  }, []);

  const fetchCustomization = async () => {
    const user = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.data.user.id)
      .single();
    setAvatarUrl(profile.avatar_url);

    const { data: badgeList } = await supabase
      .from('badges')
      .select('name, icon_url')
      .eq('user_id', user.data.user.id);
    setBadges(badgeList);
  };

  const changeAvatar = async (url) => {
    const user = await supabase.auth.getUser();
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.data.user.id);
    setAvatarUrl(url);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil Özelleştirme</Text>
      <Text>Mevcut Avatar:</Text>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />

      <Text style={styles.section}>🎖️ Rozetler</Text>
      <FlatList
        data={badges}
        keyExtractor={item => item.name}
        horizontal
        renderItem={({ item }) => (
          <Image source={{ uri: item.icon_url }} style={styles.badge} />
        )}
      />

      <Text style={styles.section}>🧍 Avatar Seç</Text>
      <FlatList
        data={[
          'https://example.com/avatar1.png',
          'https://example.com/avatar2.png',
          'https://example.com/avatar3.png',
        ]}
        keyExtractor={item => item}
        horizontal
        renderItem={({ item }) => (
          <Button title="Seç" onPress={() => changeAvatar(item)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  section: { marginTop: 20, fontSize: 18, fontWeight: '600' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginVertical: 10 },
  badge: { width: 50, height: 50, margin: 5 },
});