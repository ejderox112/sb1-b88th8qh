import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { listSuggestions, approveSuggestion, rejectSuggestion } from '@/lib/indoor/store';

export default function IndoorModerationScreen() {
  const router = useRouter();
  const [items, setItems] = useState(() => listSuggestions('pending'));
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email === 'ejderha112@gmail.com') {
        setIsAdmin(true);
      } else {
        Alert.alert('Erişim Engellendi', 'Bu sayfaya sadece adminler erişebilir');
        router.back();
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Yetki kontrolü yapılıyor...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const refresh = () => setItems(listSuggestions('pending'));

  const onApprove = (id: string) => {
    approveSuggestion(id);
    refresh();
  };
  const onReject = (id: string) => {
    rejectSuggestion(id);
    refresh();
  };

  useEffect(() => {
    const i = setInterval(refresh, 1500);
    return () => clearInterval(i);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İç Mekan Onay Kuyruğu</Text>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        ListEmptyComponent={<Text style={styles.empty}>Bekleyen öneri yok</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.label} • {item.type}</Text>
            <Text style={styles.cardDesc}>Kat: {item.floorId} • x:{item.pos.x} y:{item.pos.y}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.approve]} onPress={() => onApprove(item.id)}><Text style={styles.btnText}>Onayla</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.reject]} onPress={() => onReject(item.id)}><Text style={styles.btnText}>Reddet</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  empty: { marginTop: 12, color: '#777' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardDesc: { color: '#666', marginTop: 4, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 8 },
  approve: { backgroundColor: '#28a745' },
  reject: { backgroundColor: '#dc3545' },
  btnText: { color: '#fff', fontWeight: '600' },
});
