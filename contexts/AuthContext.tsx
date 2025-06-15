import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthData {
  email: string;
  leadId: string;
  authenticated: boolean;
  timestamp: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  authData: AuthData | null;
  loading: boolean;
  login: (authData: AuthData) => Promise<void>;
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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      authData,
      loading,
      login,
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