import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

export default function FeedbackScreen() {
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const sendFeedback = async () => {
    try {
      // Burada Supabase veya API ile feedback kaydı yapılabilir
      setSent(true);
      setError('');
    } catch (e) {
      setError('Geri bildirim gönderilemedi: ' + e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Geri Bildirim</Text>
      <TextInput
        style={styles.input}
        placeholder="Görüşünüzü yazın..."
        value={feedback}
        onChangeText={setFeedback}
        multiline
      />
      <Button title="Gönder" onPress={sendFeedback} disabled={!feedback.trim() || sent} />
      {sent && <Text style={styles.success}>Teşekkürler! Geri bildiriminiz alındı.</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 80, marginBottom: 12 },
  success: { color: 'green', marginTop: 10 },
  error: { color: 'red', marginTop: 10 },
});
