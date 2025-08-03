import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Chrome as Home } from 'lucide-react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sayfa Bulunamadı!' }} />
      <View style={styles.container}>
        <Home size={64} color="#ccc" />
        <Text style={styles.title}>Bu sayfa mevcut değil</Text>
        <Text style={styles.subtitle}>Aradığınız sayfa bulunamadı</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Ana Sayfaya Dön</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  link: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  linkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});