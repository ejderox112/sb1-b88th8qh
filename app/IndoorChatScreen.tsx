import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { notifyChatMessage } from '@/lib/notifications';

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  type: string;
  created_at: string;
}

interface Friend {
  id: string;
  nickname: string;
  avatar_url: string;
  status_message?: string;
  is_online?: boolean;
}

interface ChatWindow {
  id: string;
  name: string;
  type: 'friend' | 'group';
  isOpen: boolean;
}

export default function IndoorChatScreen() {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [openWindows, setOpenWindows] = useState<ChatWindow[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user?.id) {
        setUserId(data.user.id);
        // Kendi profilimi çek: önce 'id' sonra 'user_id' olarak dene
        const tryFetch = async (column: 'id' | 'user_id') => {
          const res = await supabase
            .from('user_profiles')
            .select('*')
            .eq(column, data.user.id)
            .maybeSingle();
          return res;
        };
        let profileRes = await tryFetch('id');
        if (!profileRes.data) profileRes = await tryFetch('user_id');
        if (profileRes.data) {
          setMyProfile(profileRes.data);
          setStatusMessage(profileRes.data.status_message || 'Müsaitim');
        } else {
          // Eğer veritabanında profil yoksa, Google auth meta'dan doldur
          const meta = data.user.user_metadata || {};
          const metaName = (meta.full_name || meta.name || [meta.given_name, meta.family_name].filter(Boolean).join(' ')).trim();
          const metaAvatar = meta.picture || meta.avatar_url;
          const fallback = {
            id: data.user.id,
            nickname: metaName || data.user.email?.split('@')[0] || 'Kullanıcı',
            email: data.user.email,
            avatar_url: metaAvatar,
            status_message: 'Müsaitim',
          } as any;
          setMyProfile(fallback);
          setStatusMessage(fallback.status_message);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    // Arkadaşları çek - engellenenler hariç
    const fetchFriends = async () => {
      const { data: blockedIds } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', userId);
      const blocked = (blockedIds || []).map(b => b.blocked_id);
      
      const { data } = await supabase
        .from('friends')
        .select('friend_id, user_profiles!inner(id, nickname, avatar_url, status_message, location_sharing)')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .not('friend_id', 'in', `(${blocked.join(',') || 'null'})`);
      
      const friendList: Friend[] = (data || []).map((f: any) => {
        const up = Array.isArray(f.user_profiles) ? f.user_profiles[0] : f.user_profiles;
        return {
          id: up?.id || f.friend_id,
          nickname: up?.nickname || 'Kullanıcı',
          avatar_url: up?.avatar_url,
          status_message: up?.status_message,
          is_online: up?.location_sharing || false,
        };
      });
      setFriends(friendList);
    };
    // Sohbet gruplarını çek
    const fetchGroups = async () => {
      const { data } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name)')
        .eq('user_id', userId);
      const groupsNorm = (data || []).map((g: any) => Array.isArray(g.groups) ? g.groups[0] : g.groups).filter(Boolean);
      setGroups(groupsNorm);
    };
    fetchFriends();
    fetchGroups();
  }, [userId]);

  useEffect(() => {
    const activeGroup = selectedGroup || groupId;
    if (!activeGroup) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', activeGroup)
        .order('created_at', { ascending: false });
      if (data) setMessages(data);
      if (error) console.error('Mesajlar çekilemedi:', error);
    };
    fetchMessages();

    // Realtime dinleme
    const channel = supabase
      .channel('public:group_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${activeGroup}` },
        (payload) => {
          setMessages((prev) => [payload.new as GroupMessage, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroup, groupId]);

  const openChatWindow = (id: string, name: string, type: 'friend' | 'group') => {
    if (openWindows.find(w => w.id === id)) {
      setActiveChatId(id);
      return;
    }
    setOpenWindows([...openWindows, { id, name, type, isOpen: true }]);
    setActiveChatId(id);
    if (type === 'group') {
      setSelectedGroup(id);
    }
  };

  const closeChatWindow = (id: string) => {
    setOpenWindows(openWindows.filter(w => w.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  const sendMessage = async () => {
    const activeGroup = selectedGroup || groupId;
    if (!input.trim() || !userId || !activeGroup) return;
    const { error } = await supabase.from('group_messages').insert({
      group_id: activeGroup,
      sender_id: userId,
      content: input,
      type: 'text',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Mesaj gönderme hatası:', error);
    } else {
      // Gruptaki diğer üyelere bildirim gönder
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', activeGroup)
        .neq('user_id', userId);
      
      if (members && members.length > 0) {
        const senderName = myProfile?.nickname || 'Bir kullanıcı';
        const messagePreview = input.trim();
        
        // Her üyeye bildirim gönder
        members.forEach(member => {
          notifyChatMessage(member.user_id, senderName, messagePreview);
        });
      }
      
      setInput('');
      // Realtime zaten listeyi güncelleyecek
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* MSN Tarzı Profil Alanı */}
      <View style={styles.profileSection}>
        {myProfile?.avatar_url ? (
          <Image source={{ uri: myProfile.avatar_url }} style={styles.profileAvatar} />
        ) : (
          <View style={[styles.profileAvatar, {backgroundColor:'#ccc'}]} />
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{myProfile?.nickname || 'Kullanıcı'}</Text>
          <TextInput
            style={styles.statusInput}
            value={statusMessage}
            onChangeText={setStatusMessage}
            placeholder="Durum mesajınız..."
            onBlur={async () => {
              try {
                if (myProfile?.id) {
                  await supabase.from('user_profiles').update({ status_message: statusMessage }).eq('id', myProfile.id);
                } else {
                  await supabase.from('user_profiles').update({ status_message: statusMessage }).eq('user_id', userId);
                }
              } catch (e) {
                // Sessizce yakala, UI zaten güncellendi
                console.warn('Status update failed', e);
              }
            }}
          />
        </View>
      </View>

      {/* MSN Tarzı Arkadaş Listesi */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>📋 Arkadaşlarım ({friends.length})</Text>
        {friends.map(friend => (
          <TouchableOpacity
            key={friend.id}
            style={styles.friendItem}
            onPress={() => openChatWindow(friend.id, friend.nickname, 'friend')}
          >
            {friend.avatar_url ? (
              <Image source={{ uri: friend.avatar_url }} style={styles.friendAvatar} />
            ) : (
              <View style={[styles.friendAvatar, {backgroundColor:'#ddd'}]} />
            )}
            <View style={styles.friendDetails}>
              <Text style={styles.friendNickname}>{friend.nickname}</Text>
              <Text style={styles.friendStatus} numberOfLines={1}>
                {friend.status_message || 'Durum yok'}
              </Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: friend.is_online ? '#28a745' : '#6c757d' }]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sohbet Gruplarım */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>💬 Sohbet Gruplarım ({groups.length})</Text>
        {groups.map(group => (
          <TouchableOpacity
            key={group.id}
            style={styles.groupItem}
            onPress={() => openChatWindow(group.id, group.name, 'group')}
          >
            <Text style={styles.groupName}>👥 {group.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* MSN Tarzı Sohbet Pencereleri */}
      {openWindows.map(window => (
        <View key={window.id} style={[styles.chatWindow, activeChatId === window.id && styles.activeChatWindow]}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>{window.name}</Text>
            <TouchableOpacity onPress={() => closeChatWindow(window.id)}>
              <Text style={styles.closeBtn}>✖</Text>
            </TouchableOpacity>
          </View>
          {activeChatId === window.id && (
            <>
              <FlatList
                data={messages}
                keyExtractor={item => item.id}
                inverted
                style={styles.messagesList}
                renderItem={({ item }) => (
                  <View style={[styles.msg, item.sender_id === userId ? styles.myMsg : styles.otherMsg]}>
                    <Text style={styles.msgText}>{item.content}</Text>
                    <Text style={styles.msgMeta}>{item.sender_id === userId ? 'Ben' : item.sender_id}</Text>
                  </View>
                )}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Mesaj yaz..."
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                  <Text style={styles.sendText}>Gönder</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f0f2f5' },
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 12 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  statusInput: { fontSize: 14, color: '#555', borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 2 },
  listSection: { marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  listTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  friendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  friendAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  friendDetails: { flex: 1 },
  friendNickname: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  friendStatus: { fontSize: 12, color: '#888' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  groupItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  groupName: { fontSize: 15, fontWeight: '600' },
  chatWindow: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
  activeChatWindow: { borderWidth: 2, borderColor: '#007AFF' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  chatTitle: { fontSize: 16, fontWeight: 'bold' },
  closeBtn: { fontSize: 18, color: '#dc3545', fontWeight: 'bold' },
  messagesList: { maxHeight: 200, marginVertical: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginRight: 8 },
  sendBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8 },
  sendText: { color: '#fff', fontWeight: 'bold' },
  msg: { padding: 8, borderRadius: 8, marginVertical: 4, maxWidth: '80%' },
  myMsg: { backgroundColor: '#d1e7dd', alignSelf: 'flex-end' },
  otherMsg: { backgroundColor: '#f8d7da', alignSelf: 'flex-start' },
  msgText: { fontSize: 16 },
  msgMeta: { fontSize: 10, color: '#888', marginTop: 2 },
});
