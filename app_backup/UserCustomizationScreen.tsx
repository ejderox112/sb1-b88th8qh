import { useEffect, useState } from 'react';
import { View, Text, Image, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function UserCustomizationScreen() {
  const [badges, setBadges] = useState([]);
  const [avatars, setAvatars] = useState([]);

  useEffect(() => {
    fetchAvailableItems();
  }, []);

  const fetchAvailableItems = async () => {
    const { data: badgeData } = await supabase.from('badges').select('*');
    setBadges(badgeData);
    const { data: avatarData } = await supabase.from('avatars').select('*');
    setAvatars(avatarData);
  };

  const equipItem = async (itemId, itemType) => {
    const user = await supabase.auth.getUser();
    if (itemType === 'badge') {
      await supabase.from('profiles').update({ equipped_badge_id: itemId }).eq('id', user.data.user.id);
    } else if (itemType === 'avatar') {
      await supabase.from('profiles').update({ avatar_url: itemId }).eq('id', user.data.user.id);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Karakter Özelleştir</Text>

      <Text style={styles.subtitle}>Rozetler</Text>
      <FlatList
        data={badges}
        horizontal
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <Image source={{ uri: item.image_url }} style={styles.itemImage} />
            <Button title="Kullan" onPress={() => equipItem(item.id, 'badge')} />
          </View>
        )}
      />

      <Text style={styles.subtitle}>Avatarlar</Text>
      <FlatList
        data={avatars}
        horizontal
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <Image source={{ uri: item.image_url }} style={styles.itemImage} />
            <Button title="Kullan" onPress={() => equipItem(item.id, 'avatar')} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  itemContainer: { marginRight: 15, alignItems: 'center' },
  itemImage: { width: 80, height: 80, marginBottom: 5, borderRadius: 40 },
});
