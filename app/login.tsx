import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, Platform, Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import CenteredContainer from '@/components/ui/CenteredContainer';
import { useAuth, type AccessTier } from '@/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LOGIN_URL = 'https://dementia-help-now.netlify.app/.netlify/functions/kartra-auth';
const SUPPORT_EMAIL = 'kristamesenbrink@dementiasuccesspath.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

    const normalizedEmail = email.toLowerCase().trim();

    if (!normalizedEmail) {
      showError('Email Required', 'Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      showError('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail, platform: Platform.OS }),
      });

      const data = await response.json();

      if (data.isVerified && (data.tier || data.hasActiveSubscription)) {
        // Logins before October 2026 returned no tier; those were members.
        const tier: AccessTier = data.tier === 'free' ? 'free' : 'member';
        await login({
          email: data.email || normalizedEmail,
          leadId: data.leadId || '',
          authenticated: true,
          timestamp: Date.now(),
          tier,
        });

        // Navigate to main app
        router.replace('/(tabs)');
      } else if (data.isVerified && !data.hasActiveSubscription) {
        showError(
          'No Active Membership',
          `Your email was found but you don't have an active membership (or your membership is under a different email.) Please email ${SUPPORT_EMAIL} if you believe this is an error.`
        );
      } else if (data.error) {
        showError(
          'Try Again',
          'We couldn\'t check your email just now. Please try again in a minute.'
        );
      } else {
        showError(
          'Email Not Found',
          `We couldn't find that email. Use the email you signed up with on Facebook, or the email on your membership. Need help? Email ${SUPPORT_EMAIL}.`
        );
      }
    } catch (error) {
      console.error('Login error:', error);
      showError(
        'Connection Error',
        'Unable to log you in. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredContainer>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Pink Header Section */}
          <View style={[styles.headerSection, { paddingTop: insets.top + 20 }]}>
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
              <Text style={styles.subtitle}>Enter the email you signed up with, or the email on your membership.</Text>

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
                  <Text style={styles.loginButtonText}>Log In</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.helpText}>
                Need help? Contact support at {SUPPORT_EMAIL}
              </Text>

              {/* Sign-up section – hidden on iOS to comply with App Store guideline 3.1.1 */}
              {Platform.OS !== 'ios' && (
                <View style={styles.nonMemberSection}>
                  <Text style={styles.nonMemberTitle}>Don't have access yet?</Text>
                  <Text style={styles.nonMemberDescription}>
                    The app is free for family caregivers. Sign up, then log in here with the same email.
                  </Text>

                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => Linking.openURL('https://dementiasuccesspath.com/dementia-help-now-app')}
                  >
                    <Text style={styles.linkButtonText}>Get the Free App</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => Linking.openURL('https://dementiasuccesspath.com/dementia-caregiving-made-easy')}
                  >
                    <Text style={styles.linkButtonText}>Learn About Membership</Text>
                  </TouchableOpacity>
                </View>
              )}
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
