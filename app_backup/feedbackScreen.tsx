import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';

export default function FeedbackScreen() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('');

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
    setFeedbacks(data);
  };

  const submitFeedback = async () => {
    const user = await supabase.auth.getUser();
    await supabase.from('feedback').insert({
      user_id: user.data.user.id,
      comment,
      rating: parseInt(rating),
    });
    setComment('');
    setRating('');
    fetchFeedbacks();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Geri Bildirim</Text>
      <TextInput
        style={styles.input}
        placeholder="Yorumunuzu yazın"
        value={comment}
        onChangeText={setComment}
      />
      <TextInput
        style={styles.input}
        placeholder="Puan (1-5)"
        value={rating}
        onChangeText={setRating}
        keyboardType="numeric"
      />
      <Button title="Gönder" onPress={submitFeedback} />
      <FlatList
        data={feedbacks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>⭐ {item.rating}</Text>
            <Text>{item.comment}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginVertical: 5,
    borderRadius: 5,
  },
  card: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
});