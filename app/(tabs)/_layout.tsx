import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

function CustomHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/index' || pathname === '/(tabs)/index' || pathname === '/';

  return (
    <View style={styles.header}>
      <View style={styles.innerHeader}>
        <View style={styles.topRow}>
          {/* Back button (hidden on Home) */}
          {!isHome ? (
            <TouchableOpacity 
              onPress={() => {
                console.log('Back button pressed');
                router.back();
              }}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} /> // spacer so logo stays centered
          )}

          {/* Centered logo */}
          <Image
            source={require('../../assets/images/appheader.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Help Now link */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/help-now')}
            style={{ paddingRight: 6 }}
          >
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.appNameHelp}>Help</Text>
              <Text style={styles.appNameNow}>Now!</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
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
          tabBarStyle: { display: 'none' },
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
        <TouchableOpacity 
          onPress={() => {
            console.log('Home button pressed');
            router.push('/');
          }} 
          style={styles.floatingHomeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
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
  },
  innerHeader: {
    width: '100%',
    maxWidth: 480,
    marginHorizontal: 'auto',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 12,
    borderRadius: 30,
    minWidth: 52,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
