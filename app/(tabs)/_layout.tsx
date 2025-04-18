import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { View, Image, Text, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import CenteredContainer from '@/components/ui/CenteredContainer';

function CustomHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === '/index' || pathname === '/(tabs)/index' || pathname === '/';

  return (
    <View style={styles.header}>
      {!isHome && (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      )}

      <Image
        source={require('../../assets/images/appheader.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Help Now link */}
      <TouchableOpacity 
        onPress={() => router.push('/(tabs)/help-now')} 
        style={{ position: 'absolute', right: 30, top: 80 }}
      >
        <Text style={styles.appNameHelp}>Help</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => router.push('/(tabs)/help-now')} 
        style={{ position: 'absolute', right: 28, top: 95 }}
      >
        <Text style={styles.appNameNow}>Now!</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === '/index' || pathname === '/(tabs)/index' || pathname === '/';

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          header: () => <CustomHeader />,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: { display: 'none' }, // hide bottom bar
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          }}
        />
      </Tabs>

      {/* Floating Home Button (only if not on Home) */}
      {!isHome && (
        <TouchableOpacity onPress={() => router.push('/')} style={styles.floatingHomeButton}>
          <Ionicons name="home" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#DAB2AC',
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 83,
  },
  logo: {
    width: 250,
    height: 60,
  },
  appNameHelp: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
  },
  appNameNow: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
  },
  floatingHomeButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 12,
    borderRadius: 30,
  },
});
