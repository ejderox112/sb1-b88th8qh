import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import ErrorMessage from '@/components/ErrorMessage';
import { getUserReports, reviewUserReport, addModerationAction } from '@/lib/moderationLogic';
import { supabase } from '@/lib/supabase';

export default function ModerationPanelScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchText, setSearchText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchReports();
    supabase.auth.getUser().then(res => setUser(res.data.user));
  }, [statusFilter, searchText]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await getUserReports(statusFilter);
      let filtered = data || [];
      if (searchText.trim()) {
        filtered = filtered.filter(r =>
          r.reason?.toLowerCase().includes(searchText.toLowerCase()) ||
          r.details?.toLowerCase().includes(searchText.toLowerCase()) ||
          r.reported_user_id?.toLowerCase().includes(searchText.toLowerCase())
        );
      }
      setReports(filtered);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg('Raporlar yüklenemedi: ' + e.message);
    }
    setLoading(false);
  };

  const handleAction = async (reportId, action) => {
    if (!user) return;
    try {
      await reviewUserReport(reportId, action === 'approve' ? 'reviewed' : 'rejected', user.id);
      await addModerationAction(reportId, user.id, action);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg('İşlem başarısız: ' + e.message);
    }
    fetchReports();
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Raporlar</Text>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        <Button title="Bekleyen" onPress={() => setStatusFilter('pending')} color={statusFilter === 'pending' ? '#0077cc' : undefined} />
        <Button title="İncelendi" onPress={() => setStatusFilter('reviewed')} color={statusFilter === 'reviewed' ? '#0077cc' : undefined} />
        <Button title="Reddedilen" onPress={() => setStatusFilter('rejected')} color={statusFilter === 'rejected' ? '#0077cc' : undefined} />
      </View>
      <View style={{ marginBottom: 10 }}>
        <Text>Arama:</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 6 }}
          placeholder="Kullanıcı, sebep veya açıklama..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
      <ErrorMessage message={errorMsg} />
      <FlatList
        data={reports}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.reportBox}>
            <Text style={styles.reportText}>Raporlanan Kullanıcı: {item.reported_user_id}</Text>
            <Text style={styles.reportText}>Sebep: {item.reason}</Text>
            <Text style={styles.reportText}>Açıklama: {item.details}</Text>
            <View style={styles.buttonRow}>
              <Button title="Onayla" onPress={() => handleAction(item.id, 'approve')} />
              <Button title="Reddet" color="red" onPress={() => handleAction(item.id, 'reject')} />
              <Button title="Banla" color="orange" onPress={() => handleAction(item.id, 'ban')} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  reportBox: { padding: 12, marginBottom: 16, backgroundColor: '#f2f2f2', borderRadius: 8 },
  reportText: { fontSize: 15, marginBottom: 4 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});
