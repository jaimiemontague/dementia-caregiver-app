import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccessTier = 'free' | 'member';

interface AuthData {
  email: string;
  leadId: string;
  authenticated: boolean;
  timestamp: number;
  /** Set by logins since October 2026. Sessions without it predate the free tier and were members. */
  tier?: AccessTier;
}

interface AuthContextType {
  isAuthenticated: boolean;
  /** True for members, and for sessions created before tiers existed (members only back then). */
  isMember: boolean;
  authData: AuthData | null;
  loading: boolean;
  login: (authData: AuthData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const storedAuth = await AsyncStorage.getItem('userAuth');
      if (storedAuth) {
        const parsedAuth: AuthData = JSON.parse(storedAuth);

        // Check if auth is less than 30 days old
        const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        const isRecent = Date.now() - parsedAuth.timestamp < thirtyDays;

        if (isRecent && parsedAuth.authenticated) {
          setAuthData(parsedAuth);
          setIsAuthenticated(true);
        } else {
          // Auth is too old, clear it
          await AsyncStorage.removeItem('userAuth');
          setAuthData(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (newAuthData: AuthData) => {
    try {
      await AsyncStorage.setItem('userAuth', JSON.stringify(newAuthData));
      setAuthData(newAuthData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userAuth');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    } finally {
      setAuthData(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const isMember = isAuthenticated && authData?.tier !== 'free';

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isMember,
      authData,
      loading,
      login,
      logout,
      checkAuthStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
