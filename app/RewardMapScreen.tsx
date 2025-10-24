import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export default function RewardMapScreen() {
  const [location, setLocation] = useState(null);
  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();

    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    const { data } = await supabase.from('rewards').select('*');
    setRewards(data);
  };

  const claimReward = async (rewardId) => {
    const user = await supabase.auth.getUser();
    await supabase.from('rewards').update({
      claimed_by: user.data.user.id,
      claimed_at: new Date().toISOString(),
    }).eq('id', rewardId);
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
          {rewards.map(reward => (
            <Marker
              key={reward.id}
              coordinate={{ latitude: reward.lat, longitude: reward.lng }}
              title={reward.location}
              description={`Ödül: ${reward.points} puan`}
              onCalloutPress={() => claimReward(reward.id)}
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