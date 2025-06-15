import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import CenteredContainer from '@/components/ui/CenteredContainer';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://dementia-help-now.netlify.app/.netlify/functions/kartra-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (data.isVerified && data.hasActiveSubscription) {
        // Store authentication data using context
        await login({
          email: data.email,
          leadId: data.leadId,
          authenticated: true,
          timestamp: Date.now(),
        });

        // Navigate to main app
        router.replace('/(tabs)');
      } else if (data.isVerified && !data.hasActiveSubscription) {
        Alert.alert(
          'No Active Membership',
          'Your email was found but you don\'t have an active membership. Please contact support if you believe this is an error.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Email Not Found',
          'We couldn\'t find your email in our system. Please make sure you\'re using the email associated with your membership.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to verify your membership. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredContainer>
      <View style={styles.container}>
        {/* Pink Header Section */}
        <View style={styles.headerSection}>
          {/* App Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/appheader.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* White Form Section */}
        <View style={styles.formSection}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.subtitle}>Please enter your email to verify your membership.</Text>
            
            <TextInput
              style={styles.emailInput}
              placeholder="Enter your email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Verify Membership</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.helpText}>
              Need help? Contact support at kristamesenbrink@dementiasuccesspath.com
            </Text>
          </View>
        </View>
      </View>
    </CenteredContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSection: {
    backgroundColor: '#FFA790',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 80,
  },
  formSection: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
    paddingHorizontal: 30,
    paddingTop: 30,
  },
  formContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  emailInput: {
    width: '100%',
    maxWidth: 400,
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
  },
  loginButton: {
    width: '100%',
    maxWidth: 400,
    height: 50,
    backgroundColor: '#FFA790',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
}); 