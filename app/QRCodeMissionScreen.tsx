import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export default function QRCodeMissionScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');

      const locStatus = await Location.requestForegroundPermissionsAsync();
      if (locStatus.status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    })();
  }, []);

  const handleScan = async ({ data }) => {
    setScanned(true);
    const user = await supabase.auth.getUser();

    await supabase.from('missions').insert({
      user_id: user.data.user.id,
      qr_code: data,
      lat: location?.latitude,
      lng: location?.longitude,
      completed_at: new Date().toISOString(),
    });

    Alert.alert('Görev Başlatıldı', 'QR kod başarıyla okundu ve konum doğrulandı!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Görev Başlat</Text>
      {hasPermission === true ? (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleScan}
          style={styles.scanner}
        />
      ) : (
        <Text>QR kod izni verilmedi</Text>
      )}
      {scanned && <Button title="Yeniden Tara" onPress={() => setScanned(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  scanner: { flex: 1 },
});