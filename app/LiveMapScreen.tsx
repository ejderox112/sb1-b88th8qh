
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// NOTE: This entire file is temporarily commented out to allow the web preview to build.
// It imports native-only modules (react-native-maps, expo-location) that are not compatible with web.

export default function LiveMapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map functionality is temporarily disabled for web preview.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, color: '#999', textAlign: 'center', padding: 20 },
});

/*
import { useEffect, useState } from 'react';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export default function LiveMapScreen() {
  const [location, setLocation] = useState(null);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [myLevel, setMyLevel] = useState(1);

  useEffect(() => {
    getLocationAndLevel();
    const interval = setInterval(() => {
      getLocationAndLevel();
      fetchNearbyUsers();
      fetchActiveTasks();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getLocationAndLevel = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc.coords);

    const user = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('level')
      .eq('id', user.data.user.id)
      .single();

    setMyLevel(profile.level);

    await supabase.from('location_logs').insert({
      user_id: user.data.user.id,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      updated_at: new Date().toISOString(),
    });
  };

  const fetchNearbyUsers = async () => {
    const { data: allUsers } = await supabase
      .from('location_logs')
      .select('user_id, lat, lng, profiles(nickname, avatar_url, level)')
      .order('updated_at', { ascending: false })
      .limit(50);

    const filtered = filterVisibleUsers(location.latitude, location.longitude, myLevel, allUsers);
    setUsers(filtered);
  };

  const fetchActiveTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, lat, lng')
      .eq('active', true);
    setTasks(data);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗺️ Canlı Görev Haritası</Text>
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="Ben"
            pinColor="blue"
          />
          {users.map(u => (
            <Marker
              key={u.user_id}
              coordinate={{ latitude: u.lat, longitude: u.lng }}
              title={u.profiles.nickname}
              description={`Seviye ${u.profiles.level}`}
              image={{ uri: u.profiles.avatar_url }}
            />
          ))}
          {tasks.map(t => (
            <Marker
              key={t.id}
              coordinate={{ latitude: t.lat, longitude: t.lng }}
              title={t.title}
              pinColor="orange"
            />
          ))}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', padding: 10 },
  map: { flex: 1 },
});
*/
