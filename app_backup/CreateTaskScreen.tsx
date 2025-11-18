import { useState, useEffect } from 'react';
import { View, TextInput, Text, Button, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { suggestTags, generateTitle } from '../lib/taskSuggestor';

export default function CreateTaskScreen() {
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);

  useEffect(() => {
    fetchTagSuggestions();
  }, [description]);

  const fetchTagSuggestions = async () => {
    const user = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('interest_tags')
      .eq('id', user.data.user.id)
      .single();

    const { data: allTags } = await supabase
      .from('task_tags')
      .select('name');

    const tags = suggestTags(profile.interest_tags, allTags.map(t => t.name));
    setTagSuggestions(tags);
    setTitle(generateTitle(description));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Görev Açıklaması</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Görev detaylarını yaz..."
      />
      <Text style={styles.label}>Önerilen Başlık: {title}</Text>
      <Text style={styles.label}>Etiket Önerileri:</Text>
      {tagSuggestions.map(tag => (
        <Text key={tag} style={styles.tag}>{tag}</Text>
      ))}
      <Button title="Görevi Oluştur" onPress={() => {/* görev kaydı */}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  label: { fontWeight: 'bold', marginTop: 10 },
  input: { borderWidth: 1, padding: 10, marginVertical: 10 },
  tag: { backgroundColor: '#ddd', padding: 5, margin: 2, borderRadius: 5 },
});