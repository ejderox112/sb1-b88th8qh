import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: Platform.OS === 'web' ? 4 : 8,
          paddingTop: Platform.OS === 'web' ? 4 : 8,
          height: Platform.OS === 'web' ? 60 : 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600' as const,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Harita',
          tabBarIcon: ({ size, color }) => (
            <Text style={{ fontSize: size, color: color, fontWeight: 'bold' as const }}>M</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: 'Konumlar',
          tabBarIcon: ({ size, color }) => (
            <Text style={{ fontSize: size, color: color, fontWeight: 'bold' as const }}>L</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ size, color }) => (
            <Text style={{ fontSize: size, color: color, fontWeight: 'bold' as const }}>P</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="indoor"
        options={{
          title: 'İç Mekan',
          tabBarIcon: ({ size, color }) => (
            <Text style={{ fontSize: size, color: color, fontWeight: 'bold' as const }}>İ</Text>
          ),
        }}
      />
    </Tabs>
  );
}