import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return; // Don't navigate while checking auth status

    const inAuthGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && inAuthGroup) {
      // User is not authenticated but trying to access protected routes
      router.replace('/login');
    } else if (isAuthenticated && !inAuthGroup) {
      // User is authenticated but on login screen
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, loading, segments]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA790" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
}); 