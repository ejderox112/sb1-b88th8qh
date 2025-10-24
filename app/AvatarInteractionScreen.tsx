import { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Image } from 'react-native';
import { supabase } from '../lib/supabase';

const EMOJI_REACTIONS = [
  { emoji: '👋', type: 'selam' },
  { emoji: '💃', type: 'dans' },
  { emoji: '👏', type: 'alkış' },
  { emoji: '😄', type: 'gülme' },
  { emoji: '😡', type: 'kızgın' },
  { emoji: '😱', type: 'şaşkın' },
  { emoji: '😍', type: 'beğeni' },
  { emoji: '😎', type: 'cool' },
];

export default function AvatarInteractionScreen() {
  const [groupMembers, setGroupMembers] = useState([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (userId) fetchGroupMembers();
  }, [userId]);

  const getUser = async () => {
    const user = await supabase.auth.getUser();
    setUserId(user.data.user.id);
  };

  const fetchGroupMembers = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, nickname, avatar_url')
      .eq('group_id', 'current_group_id'); // dinamik yapılabilir
    setGroupMembers(data);
  };

  const sendReaction = async (targetId, reaction) => {
    await supabase.from('avatar_reactions').insert({
      sender_id: userId,
      receiver_id: targetId,
      emoji_code: reaction.emoji,
      emotion_type: reaction.type,
      sent_at: new Date().toISOString(),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧍‍♂️ Avatar Etkileşimleri</Text>
      <FlatList
        data={groupMembers}
        keyExtractor={item => item.user_id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            <Text>{item.nickname}</Text>
            <FlatList
              data={EMOJI_REACTIONS}
              horizontal
              keyExtractor={r => r.emoji}
              renderItem={({ item: reaction }) => (
                <Button
                  title={reaction.emoji}
                  onPress={() => sendReaction(item.user_id, reaction)}
                />
              )}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  card: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 5 },
});