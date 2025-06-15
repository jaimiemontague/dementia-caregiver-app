import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import CenteredContainer from '@/components/ui/CenteredContainer';

export default function NotFoundScreen() {
  return (
    <>
      <CenteredContainer>
        <Stack.Screen options={{ title: 'Oops!' }} />
        <View style={styles.container}>
          <Text style={styles.title}>This screen doesn't exist.</Text>
          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>Go to home screen!</Text>
          </Link>
        </View>
      </CenteredContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    color: '#1e90ff',
    fontSize: 18,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
