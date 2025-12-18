import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { notifyFriendRequest } from '@/lib/notifications';

interface UserSearchResult {
  id: string;
  nickname: string;
  email?: string;
  full_name?: string;
  user_code?: string;
  avatar_url?: string;
}

export default function AddFriendScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [info, setInfo] = useState('');

  const searchUsers = async () => {
    if (!search.trim()) {
      setInfo('Arama metni girin');
      return;
    }
    
    const searchTerm = search.trim().toLowerCase();
    
    // Basit arama: nickname, user_code, full_name, email (schema-guaranteed kolonlar)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, nickname, email, full_name, user_code, avatar_url')
      .or(`nickname.ilike.%${searchTerm}%,user_code.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(20);
      
    if (error) {
      console.error('Arama hatası:', error);
      setInfo('Arama sırasında hata oluştu');
      return;
    }
    
    if (data && data.length > 0) {
      setResults(data);
      setInfo(`${data.length} kullanıcı bulundu`);
    } else {
      setResults([]);
      setInfo('Kullanıcı bulunamadı');
    }
  };

  const sendRequest = async (userId: string) => {
    const { data: me } = await supabase.auth.getUser();
    if (!me?.user?.id) return setInfo('Oturum yok');
    // Bugün eklenen arkadaş sayısını kontrol et
    const today = new Date();
    today.setHours(0,0,0,0);
    const { count, error } = await supabase
      .from('friend_requests')
      .select('id', { count: 'exact', head: true })
      .eq('requester_id', me.user.id)
      .gte('created_at', today.toISOString());
    if ((count ?? 0) >= 15) {
      setInfo('❌ Bir günde en fazla 15 arkadaş ekleyebilirsiniz.');
      return;
    }
    // Engelleme kontrolü
    const { data: blocked } = await supabase
      .from('blocks')
      .select('id')
      .or(`(blocker_id.eq.${me.user.id},blocked_id.eq.${userId}),(blocker_id.eq.${userId},blocked_id.eq.${me.user.id})`);
    if (blocked && blocked.length > 0) {
      setInfo('❌ Bu kullanıcı ile etkileşim engellenmiş.');
      return;
    }
    
    // Zaten arkadaş mı kontrol et
    const { data: existingFriend } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', me.user.id)
      .eq('friend_id', userId)
      .single();
    
    if (existingFriend) {
      setInfo('ℹ️ Bu kullanıcı zaten arkadaşınız.');
      return;
    }
    
    // Bekleyen istek var mı kontrol et
    const { data: pendingRequest } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('requester_id', me.user.id)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .single();
    
    if (pendingRequest) {
      setInfo('⏳ Bu kullanıcıya zaten arkadaşlık isteği göndermişsiniz.');
      return;
    }
    
    const { data: insertData, error: insertError } = await supabase.from('friend_requests').insert({
      requester_id: me.user.id,
      receiver_id: userId,
      status: 'pending',
      created_at: new Date().toISOString(),
    }).select().single();
    
    if (insertError) {
      setInfo('❌ İstek gönderilemedi: ' + insertError.message);
      return;
    }
    
    // Kullanıcının adını al
    const { data: myProfile } = await supabase
      .from('user_profiles')
      .select('nickname')
      .eq('id', me.user.id)
      .single();
    
    // Bildirim gönder
    await notifyFriendRequest(
      userId,
      myProfile?.nickname || 'Bir kullanıcı',
      insertData.id
    );
    
    setInfo('✅ Arkadaşlık isteği gönderildi! Kullanıcı bildirim alacak.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Arkadaş Ekle</Text>
      <TextInput
        style={styles.input}
        value={search}
        onChangeText={setSearch}
        placeholder="Email, kullanıcı adı, kod veya isim"
      />
      <TouchableOpacity style={styles.searchBtn} onPress={searchUsers}>
        <Text style={styles.searchText}>Ara</Text>
      </TouchableOpacity>
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <Text style={styles.userName}>{item.nickname || 'İsimsiz'}</Text>
            {item.full_name && <Text style={styles.userDetail}>Ad: {item.full_name}</Text>}
            {item.email && <Text style={styles.userDetail}>Email: {item.email}</Text>}
            {item.user_code && <Text style={styles.userDetail}>Kod: {item.user_code}</Text>}
            <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(item.id)}>
              <Text style={styles.addText}>Arkadaş Ekle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.addBtn, {backgroundColor:'#ffc107',marginTop:4}]} 
              onPress={() => router.push({ pathname: '/ReportUserScreen' as any, params: { reportedUserId: item.id, reportedUserName: item.nickname || 'Kullanıcı' } })}
            >
              <Text style={{color:'#fff',fontWeight:'bold',textAlign:'center'}}>🚨 Şikayet Et</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, {backgroundColor:'#dc3545',marginTop:4}]} onPress={async () => {
              const { data: me } = await supabase.auth.getUser();
              if (!me?.user?.id) return setInfo('Oturum yok');
              await supabase.from('blocks').insert({ blocker_id: me.user.id, blocked_id: item.id, created_at: new Date().toISOString() });
              setInfo('Kullanıcı engellendi. Artık birbirinizi göremezsiniz.');
            }}>
              <Text style={{color:'#fff',fontWeight:'bold',textAlign:'center'}}>Engelle</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {info ? <Text style={styles.info}>{info}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8 },
  searchBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8, marginBottom: 8 },
  searchText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  userCard: { padding: 8, borderRadius: 8, backgroundColor: '#f8f8f8', marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  userDetail: { fontSize: 13, color: '#666', marginBottom: 2 },
  adminBadge: { fontSize: 12, color: '#007AFF', fontWeight: '700', marginTop: 2, marginBottom: 4 },
  addBtn: { backgroundColor: '#28a745', padding: 8, borderRadius: 8, marginTop: 6 },
  addText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  info: { marginTop: 10, padding: 10, backgroundColor: '#e9f9ff', borderRadius: 8, color: '#007AFF', fontWeight: '600', textAlign: 'center' },
});
