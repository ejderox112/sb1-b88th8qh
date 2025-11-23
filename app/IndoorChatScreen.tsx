import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { supabase } from '@/lib/supabase';

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  type: string;
  created_at: string;
}

export default function IndoorChatScreen() {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState('');
  const groupId = 'demo-group-1'; // örnek grup id, dinamik yapılabilir

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user?.id) setUserId(data.user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      if (data) setMessages(data);
    };
    fetchMessages();
    // Realtime dinleme eklenebilir
  }, [groupId]);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;
    await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: userId,
      content: input,
      type: 'text',
      created_at: new Date().toISOString(),
    });
    setInput('');
    // Mesajları tekrar çek
    const { data } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (data) setMessages(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Arkadaşlar ile Sohbet</Text>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        inverted
        renderItem={({ item }) => (
          <View style={[styles.msg, item.sender_id === userId ? styles.myMsg : styles.otherMsg]}>
            <Text style={styles.msgText}>{item.content}</Text>
            <Text style={styles.msgMeta}>{item.sender_id === userId ? 'Ben' : item.sender_id}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Mesaj yaz..."
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginRight: 8 },
  sendBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8 },
  sendText: { color: '#fff', fontWeight: 'bold' },
  msg: { padding: 8, borderRadius: 8, marginVertical: 4 },
  myMsg: { backgroundColor: '#d1e7dd', alignSelf: 'flex-end' },
  otherMsg: { backgroundColor: '#f8d7da', alignSelf: 'flex-start' },
  msgText: { fontSize: 16 },
  msgMeta: { fontSize: 10, color: '#888', marginTop: 2 },
});
