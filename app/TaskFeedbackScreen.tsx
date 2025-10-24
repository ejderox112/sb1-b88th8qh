import { useState, useEffect } from 'react';
import { View, Text, Button, TextInput, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

const EMOJIS = ['👏', '😄', '❤️', '😮'];

export default function TaskFeedbackScreen({ taskId, targetUserId }) {
  const [comment, setComment] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    const { data } = await supabase
      .from('task_feedback')
      .select('*')
      .eq('task_id', taskId);
    setFeedbacks(data);
  };

  const sendEmoji = async emoji => {
    const user = await supabase.auth.getUser();
    await supabase.from('task_feedback').insert({
      task_id: taskId,
      sender_id: user.data.user.id,
      receiver_id: targetUserId,
      emoji,
      created_at: new Date().toISOString(),
    });
    fetchFeedbacks();
  };

  const sendComment = async () => {
    const user = await supabase.auth.getUser();
    await supabase.from('task_feedback').insert({
      task_id: taskId,
      sender_id: user.data.user.id,
      receiver_id: targetUserId,
      comment,
      created_at: new Date().toISOString(),
    });
    setComment('');
    fetchFeedbacks();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Görev Tepkileri</Text>
      <View style={styles.emojiRow}>
        {EMOJIS.map(e => (
          <Button key={e} title={e} onPress={() => sendEmoji(e)} />
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Yorum yaz..."
        value={comment}
        onChangeText={setComment}
      />
      <Button title="Yorumu Gönder" onPress={sendComment} />
      <FlatList
        data={feedbacks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text style={styles.feedback}>
            {item.emoji || ''} {item.comment || ''} — @{item.sender_id.slice(0, 6)}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  input: { borderWidth: 1, padding: 8, marginBottom: 10 },
  feedback: { paddingVertical: 4 },
});