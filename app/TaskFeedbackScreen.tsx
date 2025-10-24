import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

const EMOJIS = ['👍', '🔥', '😂', '💡', '👎'];

export default function TaskFeedbackScreen() {
  const [comments, setComments] = useState([]);
  const [taskId, setTaskId] = useState(''); // Görev ID dışarıdan alınabilir

  useEffect(() => {
    if (taskId) fetchComments();
  }, [taskId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('task_comments')
      .select('id, user_id, text, reactions')
      .eq('task_id', taskId);
    setComments(data);
  };

  const reactToComment = async (commentId, emoji) => {
    const { data } = await supabase
      .from('task_comments')
      .select('reactions')
      .eq('id', commentId)
      .single();

    const reactions = data?.reactions || {};
    reactions[emoji] = (reactions[emoji] || 0) + 1;

    await supabase.from('task_comments').update({ reactions }).eq('id', commentId);
    fetchComments();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Görev Geri Bildirimleri</Text>
      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.text}</Text>
            <View style={styles.reactions}>
              {EMOJIS.map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => reactToComment(item.id, emoji)}>
                  <Text style={styles.emoji}>
                    {emoji} {item.reactions?.[emoji] || 0}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  },
  reactions: { flexDirection: 'row', marginTop: 5 },
  emoji: { marginRight: 10, fontSize: 18 },
});