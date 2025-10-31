import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function MessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    getUser();
    subscribeMessages();
  }, []);

  const getUser = async () => {
    const user = await supabase.auth.getUser();
    setUserId(user.data.user.id);
  };

  const subscribeMessages = () => {
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        fetchMessages();
      })
      .subscribe();

    fetchMessages();
    return () => supabase.removeChannel(channel);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    setMessages(data);
  };

  const sendMessage = async () => {
    if (!text || !recipientId) return;
    await supabase.from('messages').insert({
      sender_id: userId,
      receiver_id: recipientId,
      content: text,
    });
    setText('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mesajlaşma</Text>
      <Text align="left">Alıcı ID:</Text>
      <TextInput
        placeholder="Kullanıcı ID"
        value={recipientId}
        onChangeText={setRecipientId}
        style={styles.input}
      />
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text>
            {item.sender_id === userId ? 'Ben: ' : 'Onlar: '}
            {item.content}
          </Text>
        )}
      />
      <TextInput
        placeholder="Mesaj yaz..."
        value={text}
        onChangeText={setText}
        style={styles.input}
      />
      <Button title="Gönder" onPress={sendMessage} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginVertical: 5,
    borderRadius: 5,
  },
});