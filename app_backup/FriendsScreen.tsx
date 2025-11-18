import { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function FriendsScreen() {
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUsers();
      fetchFriends();
    }
  }, [userId]);

  const getUser = async () => {
    const user = await supabase.auth.getUser();
    setUserId(user.data.user.id);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname')
      .neq('id', userId);
    setUsers(data);
  };

  const fetchFriends = async () => {
    const { data } = await supabase
      .from('friends')
      .select('friend_id, nickname:profiles(nickname)')
      .eq('user_id', userId);
    setFriends(data);
  };

  const followUser = async (targetId) => {
    await supabase.from('friends').insert({
      user_id: userId,
      friend_id: targetId,
    });
    fetchFriends();
  };

  const inviteToGroup = async (targetId) => {
    await supabase.from('group_invites').insert({
      sender_id: userId,
      receiver_id: targetId,
      sent_at: new Date().toISOString(),
    });
    alert('Grup daveti gönderildi!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Arkadaşlarım</Text>
      <FlatList
        data={friends}
        keyExtractor={item => item.friend_id}
        renderItem={({ item }) => (
          <Text>🧍 {item.nickname}</Text>
        )}
      />

      <Text style={styles.section}>Kullanıcılar</Text>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.nickname}</Text>
            <Button title="Takip Et" onPress={() => followUser(item.id)} />
            <Button title="Gruba Davet Et" onPress={() => inviteToGroup(item.id)} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  section: { marginTop: 20, fontSize: 18, fontWeight: '600' },
  card: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
});