import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { View, Image, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

function CustomHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // Confirm pathname on index screen (can also console.log it to check exact value)
  const isHome = pathname === '/index' || pathname === '/(tabs)/index' || pathname === '/';

  return (
    <View style={styles.header}>
      {!isHome && (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="home" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
      <Image
        source={require('../../assets/images/appheader.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        header: () => <CustomHeader />,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
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
    top: 65,
  },
  logo: {
    width: 250,
    height: 60,
  },
});
