import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
  FlatList,
} from 'react-native';
import { AuthService } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { User, Suggestion } from '@/types';
import { LogOut, Shield, MapPin, Clock, Check, X } from 'lucide-react-native';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [userSuggestions, setUserSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const authService = new AuthService();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        // Kullanıcı bilgilerini al
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (userError) throw userError;
        setUser(userData);

        // Kullanıcının önerilerini al
        const { data: suggestionsData, error: suggestionsError } = await supabase
          .from('suggestions')
          .select('*')
          .eq('createdBy', currentUser.id)
          .order('createdAt', { ascending: false });

        if (suggestionsError) throw suggestionsError;
        setUserSuggestions(suggestionsData || []);
      }
    } catch (error) {
      console.error('Kullanıcı verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
            } catch (error) {
              Alert.alert('Hata', 'Çıkış yapılamadı');
            }
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: Suggestion['status']) => {
    switch (status) {
      case 'pending': return <Clock size={16} color="#FFA500" />;
      case 'approved': return <Check size={16} color="#28a745" />;
      case 'rejected': return <X size={16} color="#dc3545" />;
      default: return <Clock size={16} color="#666" />;
    }
  };

  const getStatusText = (status: Suggestion['status']) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'store': return 'Mağaza';
      case 'wc': return 'WC';
      case 'elevator': return 'Asansör';
      case 'stairs': return 'Merdiven';
      case 'restaurant': return 'Restoran';
      case 'exit': return 'Çıkış';
      case 'info': return 'Bilgi';
      default: return type;
    }
  };

  const renderSuggestion = ({ item }: { item: Suggestion }) => (
    <View style={styles.suggestionItem}>
      <View style={styles.suggestionHeader}>
        <Text style={styles.suggestionName}>{item.poiName}</Text>
        <View style={styles.statusContainer}>
          {getStatusIcon(item.status)}
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.suggestionType}>
        {getTypeText(item.type)} - {item.floor}. Kat
      </Text>
      {item.description && (
        <Text style={styles.suggestionDescription}>{item.description}</Text>
      )}
      <Text style={styles.suggestionDate}>
        {new Date(item.createdAt).toLocaleDateString('tr-TR')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Kullanıcı bilgileri yüklenemedi</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Shield size={14} color="#fff" />
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <MapPin size={24} color="#007AFF" />
          <Text style={styles.statNumber}>{userSuggestions.length}</Text>
          <Text style={styles.statLabel}>Toplam Öneri</Text>
        </View>
        <View style={styles.statItem}>
          <Check size={24} color="#28a745" />
          <Text style={styles.statNumber}>
            {userSuggestions.filter(s => s.status === 'approved').length}
          </Text>
          <Text style={styles.statLabel}>Onaylanan</Text>
        </View>
        <View style={styles.statItem}>
          <Clock size={24} color="#FFA500" />
          <Text style={styles.statNumber}>
            {userSuggestions.filter(s => s.status === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Bekleyen</Text>
        </View>
      </View>

      <View style={styles.suggestionsSection}>
        <Text style={styles.sectionTitle}>Önerilerim</Text>
        <FlatList
          data={userSuggestions}
          renderItem={renderSuggestion}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MapPin size={48} color="#ccc" />
              <Text style={styles.emptyText}>Henüz öneri yapmadınız</Text>
            </View>
          }
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#dc3545" />
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  adminText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  suggestionsSection: {
    flex: 1,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  suggestionItem: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  suggestionDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  footer: {
    padding: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '600',
  },
});