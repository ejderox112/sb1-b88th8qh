import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function MessageScreen({ targetUserId }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (userId) fetchMessages();
  }, [userId]);

  const fetchUser = async () => {
    const { data: user } = await supabase.auth.getUser();
    setUserId(user.user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.user.id)
      .single();

    setIsAdmin(profile?.is_admin || false);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('user_messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('receiver_id', targetUserId)
      .order('sent_at', { ascending: true });

    if (error) {
      Alert.alert('Mesajlar alınamadı');
      return;
    }

    setMessages(data);
  };

  const sendMessage = async () => {
    if (!content.trim()) return;

    await supabase.from('user_messages').insert({
      sender_id: userId,
      receiver_id: targetUserId,
      content,
      type: 'text',
      sent_at: new Date().toISOString(),
    });

    setContent('');
    fetchMessages();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💬 Mesajlaşma</Text>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.message}>
            <Text>
              {item.sender_id === userId ? 'Ben:' : isAdmin ? `Kullanıcı ${item.sender_id.slice(0, 6)}:` : 'Karşı taraf:'}
            </Text>
            <Text>{item.content}</Text>
          </View>
        )}
      />
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        placeholder="Mesaj yaz..."
      />
      <Button title="Gönder" onPress={sendMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  message: { padding: 10, backgroundColor: '#eee', marginVertical: 5, borderRadius: 8 },
  input: { borderWidth: 1, padding: 8, marginVertical: 10 },
});