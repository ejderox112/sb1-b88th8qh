import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchBadges();
  }, []);

  const fetchProfile = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.data.user.id)
      .single();
    setProfile(data);
  };

  const fetchBadges = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', user.data.user.id);
    setBadges(data);
  };

  return (
    <View style={styles.container}>
      {profile && (
        <>
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          <Text style={styles.name}>{profile.nickname}</Text>
          <Text>Seviye: {profile.level}</Text>
        </>
      )}
      <Text style={styles.badgeTitle}>Rozetler</Text>
      <FlatList
        data={badges}
        keyExtractor={item => item.id}
        horizontal
        renderItem={({ item }) => (
          <Image source={{ uri: item.icon_url }} style={styles.badge} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  name: { fontSize: 20, marginVertical: 10 },
  badgeTitle: { marginTop: 20, fontSize: 16 },
  badge: { width: 50, height: 50, marginRight: 10 },
});