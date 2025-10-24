import { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { supabase } from '../lib/supabase';

export default function SocialConnectScreen() {
  const [userId, setUserId] = useState('');
  const [scannedId, setScannedId] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    if (scanning) {
      BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
        setHasPermission(status === 'granted');
      });
    }
  }, [scanning]);

  const handleBarCodeScanned = async ({ data }) => {
    setScanning(false);
    setScannedId(data);
    const user = await supabase.auth.getUser();
    await supabase.from('friends').insert({
      from: user.data.user.id,
      to: data,
      status: 'pending',
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Kodun</Text>
      {userId && <QRCode value={userId} size={200} />}
      <Button title="QR Tara ve Ekle" onPress={() => setScanning(true)} />
      {scanning && hasPermission && (
        <BarCodeScanner
          onBarCodeScanned={handleBarCodeScanned}
          style={{ width: 300, height: 300, marginTop: 20 }}
        />
      )}
      {scannedId ? <Text>Eklenen kullanıcı ID: {scannedId}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  title: { fontSize: 18, marginBottom: 10 },
});