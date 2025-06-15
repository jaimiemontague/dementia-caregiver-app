// THIS IS NOT THE MAIN APP LAYOUT!  This is the Expo page's layout..

import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthWrapper from '@/components/AuthWrapper';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthWrapper>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthWrapper>
    </AuthProvider>
  );
}
