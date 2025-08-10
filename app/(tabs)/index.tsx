import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';
import { POI, User } from '@/types';
import MapViewComponent from '@/components/MapView';
import POIList from '@/components/POIList';
import AddPOIModal from '@/components/AddPOIModal';
import DirectionsModal from '@/components/DirectionsModal';
import AdminPanel from '@/components/AdminPanel';
import { 
  Plus, 
  Navigation, 
  ChevronUp, 
  ChevronDown, 
  Settings,
  LogOut 
} from 'lucide-react-native';

export default function MapScreen() {
  const mounted = useRef(true);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [pois, setPois] = useState<POI[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<POI | undefined>();
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [showPOIList, setShowPOIList] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const authService = new AuthService();

  useEffect(() => {
    mounted.current = true;
    initializeApp();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const initializeApp = async () => {
    try {
      setInitializing(true);
      await Promise.all([
        checkUser(),
        loadPOIs()
      ]);
    } catch (error) {
      console.error('Uygulama başlatma hatası:', error);
    } finally {
      if (mounted.current) {
        setInitializing(false);
      }
    }
  };

  const checkUser = async () => {
    try {
      if (!mounted.current) return;
      
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        // Kullanıcı bilgilerini veritabanından al
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // Kullanıcı yoksa oluştur
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: currentUser.id,
              email: currentUser.email!,
              name: currentUser.user_metadata?.full_name || currentUser.email!,
              role: 'user',
              avatar: currentUser.user_metadata?.avatar_url,
            });

          if (insertError) throw insertError;
          
          if (!mounted.current) return;
          setUser({
            id: currentUser.id,
            email: currentUser.email!,
            name: currentUser.user_metadata?.full_name || currentUser.email!,
            role: 'user',
            avatar: currentUser.user_metadata?.avatar_url,
          });
        } else if (data) {
          if (!mounted.current) return;
          setUser(data);
        }
      }
    } catch (error) {
      console.error('Kullanıcı kontrolü hatası:', error);
    }
  };

  const loadPOIs = async () => {
    try {
      if (!mounted.current) return;
      
      const { data, error } = await supabase
        .from('pois')
        .select('*')
        .eq('isApproved', true)
        .order('name');

      if (error) throw error;
      if (!mounted.current) return;
      setPois(data || []);
    } catch (error) {
      console.error('POI yükleme hatası:', error);
    }
  };

  const handleSignIn = async () => {
    try {
      if (!mounted.current) return;
      await authService.signInWithGoogle();
      checkUser();
    } catch (error) {
      Alert.alert('Hata', 'Giriş yapılamadı');
    }
  };

  const handleSignOut = async () => {
    try {
      if (!mounted.current) return;
      await authService.signOut();
      setUser(null);
    } catch (error) {
      Alert.alert('Hata', 'Çıkış yapılamadı');
    }
  };

  const handleAddPOI = async (poiData: Omit<POI, 'id' | 'createdAt' | 'createdBy' | 'isApproved'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('suggestions')
        .insert({
          poiName: poiData.name,
          type: poiData.type,
          latitude: poiData.latitude,
          longitude: poiData.longitude,
          floor: poiData.floor,
          description: poiData.description,
          status: 'pending',
          createdBy: user.id,
        });

      if (error) throw error;
      
      Alert.alert('Başarılı', 'Öneriniz gönderildi. Admin onayından sonra görünür olacak.');
    } catch (error) {
      Alert.alert('Hata', 'Öneri gönderilemedi');
    }
  };

  const handleGetDirections = () => {
    if (selectedPOI) {
      setShowDirectionsModal(true);
    } else {
      Alert.alert('Bilgi', 'Önce bir konum seçin');
    }
  };

  // Uygulama başlatılıyorsa loading göster
  if (initializing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Uygulama başlatılıyor...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <View style={styles.authContent}>
          <Text style={styles.authTitle}>İç Mekan Navigasyon</Text>
          <Text style={styles.authSubtitle}>
            Büyük binalarda kaybolmayın! Konumları keşfedin ve yön tarifi alın.
          </Text>
          <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
            <Text style={styles.signInButtonText}>Google ile Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>İç Mekan Navigasyon</Text>
          <Text style={styles.headerSubtitle}>Hoş geldin, {user.name}</Text>
        </View>
        <View style={styles.headerRight}>
          {user.role === 'admin' && (
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => setShowAdminPanel(true)}
            >
              <Settings size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.floorSelector}>
        <TouchableOpacity
          style={styles.floorButton}
          onPress={() => setCurrentFloor(Math.max(1, currentFloor - 1))}
        >
          <ChevronDown size={20} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.floorText}>{currentFloor}. Kat</Text>
        <TouchableOpacity
          style={styles.floorButton}
          onPress={() => setCurrentFloor(currentFloor + 1)}
        >
          <ChevronUp size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapViewComponent
          pois={pois}
          selectedPOI={selectedPOI}
          onPOISelect={setSelectedPOI}
          floor={currentFloor}
        />
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowPOIList(!showPOIList)}
        >
          <Text style={styles.controlButtonText}>
            {showPOIList ? 'Haritayı Göster' : 'Konumları Listele'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>

        {selectedPOI && (
          <TouchableOpacity
            style={styles.directionsButton}
            onPress={handleGetDirections}
          >
            <Navigation size={16} color="#fff" />
            <Text style={styles.directionsButtonText}>Yön Tarifi</Text>
          </TouchableOpacity>
        )}
      </View>

      {showPOIList && (
        <View style={styles.poiListContainer}>
          <POIList
            pois={pois}
            onPOISelect={setSelectedPOI}
            selectedPOI={selectedPOI}
            floor={currentFloor}
          />
        </View>
      )}

      <AddPOIModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddPOI}
        currentLocation={currentLocation?.coords}
        floor={currentFloor}
      />

      <DirectionsModal
        visible={showDirectionsModal}
        onClose={() => setShowDirectionsModal(false)}
        toPOI={selectedPOI}
        userLocation={currentLocation?.coords}
      />

      {user.role === 'admin' && (
        <AdminPanel
          visible={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
          onPOIApproved={loadPOIs}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  authContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  signInButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  adminButton: {
    padding: 8,
  },
  signOutButton: {
    padding: 8,
  },
  floorSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  floorButton: {
    padding: 8,
  },
  floorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
  },
  mapContainer: {
    flex: 1,
  },
  bottomControls: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 8,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionsButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  poiListContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
});