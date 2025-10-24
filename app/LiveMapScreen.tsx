import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export default function LiveMapScreen() {
  const [location, setLocation] = useState(null);
  const [others, setOthers] = useState([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      const user = await supabase.auth.getUser();
      await supabase.from('live_locations').upsert({
        user_id: user.data.user.id,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        updated_at: new Date().toISOString(),
      });
    })();

    fetchOthers();

    const channel = supabase
      .channel('live_locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_locations' }, payload => {
        fetchOthers();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchOthers = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from('live_locations')
      .select('*')
      .neq('user_id', user.data.user.id);

    setOthers(data);
  };

  return (
    <View style={styles.container}>
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
            title="Sen"
            pinColor="blue"
          />
          {others.map(user => (
            <Marker
              key={user.id}
              coordinate={{ latitude: user.lat, longitude: user.lng }}
              title="Diğer"
              pinColor="green"
            />
          ))}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});