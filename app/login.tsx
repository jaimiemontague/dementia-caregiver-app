import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, Platform, Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import CenteredContainer from '@/components/ui/CenteredContainer';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const showError = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      setErrorMessage(message);
    } else {
      Alert.alert(title, message, [{ text: 'OK' }]);
    }
  };

  const clearError = () => {
    setErrorMessage('');
  };

  const handleLogin = async () => {
    clearError();

    if (!email.trim()) {
      showError('Email Required', 'Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('Invalid Email', 'Please enter a valid email address.');
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
        showError(
          'No Active Membership',
          'Your email was found but you don\'t have an active membership (or your membership is under a different email.) Please email kristamesenbrink@dementiasuccesspath.com if you believe this is an error.'
        );
      } else {
        showError(
          'Email Not Found',
          'We couldn\'t find your email in our system. Please make sure you\'re using the email associated with your membership.'
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      showError(
        'Connection Error',
        'Unable to verify your membership. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredContainer>
      <StatusBar style="dark" backgroundColor="#DAB2AC" translucent={false} />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                onChangeText={(text) => {
                  setEmail(text);
                  clearError(); // Clear error when user starts typing
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              {/* Error Message for Web */}
              {errorMessage && Platform.OS === 'web' && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}

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

              {/* Non-member information section */}
              <View style={styles.nonMemberSection}>
                <Text style={styles.nonMemberTitle}>Don't have a membership yet?</Text>
                <Text style={styles.nonMemberDescription}>
                  This app is for our private membership community. If you're looking for dementia caregiving support:
                </Text>
                
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={() => Linking.openURL('https://dementiasuccesspath.com/free-cheatsheets-bundle')}
                >
                  <Text style={styles.linkButtonText}>Get Free Resources</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={() => Linking.openURL('https://dementiasuccesspath.com/dementia-caregiving-made-easy')}
                >
                  <Text style={styles.linkButtonText}>Learn About Membership</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </CenteredContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSection: {
    backgroundColor: '#DAB2AC',
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
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 60,
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
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '500',
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  nonMemberSection: {
    marginTop: 40,
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  nonMemberTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  nonMemberDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  linkButton: {
    width: '100%',
    height: 45,
    backgroundColor: '#DAB2AC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 