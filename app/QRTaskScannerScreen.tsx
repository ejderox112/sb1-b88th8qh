import { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { supabase } from '../lib/supabase';

export default function QRTaskScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [taskInfo, setTaskInfo] = useState(null);

  const requestPermission = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleScan = async ({ data }) => {
    setScanned(true;
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('qr_code', data)
      .single();

    if (task && task.active) {
      setTaskInfo(task);
      await supabase.from('task_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user.id,
        task_id: task.id,
        started_at: new Date().toISOString(),
      });
    } else {
      alert('Geçersiz veya pasif görev.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📷 QR Görev Başlatıcı</Text>
      {hasPermission === null && <Button title="Kamera İzni Al" onPress={requestPermission} />}
      {hasPermission && !scanned && (
        <BarCodeScanner
          onBarCodeScanned={handleScan}
          style={{ height: 300, width: '100%' }}
        />
      )}
      {scanned && taskInfo && (
        <View style={styles.card}>
          <Text>Görev: {taskInfo.title}</Text>
          <Text>Açıklama: {taskInfo.description}</Text>
          <Text>Başarıyla başlatıldı ✅</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  card: {
    padding: 10,
    marginTop: 20,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
});