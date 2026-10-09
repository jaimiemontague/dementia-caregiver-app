import React, { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasPlusAccess, tierAfterStoreCheck, type AccessTier } from '@/utils/access';
import { normalizeEmail } from '@/utils/identity';

export type { AccessTier } from '@/utils/access';

interface AuthData {
  email: string;
  leadId: string;
  authenticated: boolean;
  timestamp: number;
  /** Set by logins since October 2026. Sessions without it predate the free tier and were members. */
  tier?: AccessTier;
  /** True when Plus came from a store purchase on this phone rather than from the login. */
  plusFromStore?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  /** True for members, and for sessions created before tiers existed (members only back then). */
  isMember: boolean;
  /** Plus content (the member layer and the cheat sheets): Plus buyers and members. */
  hasPlus: boolean;
  /** The tier to gate content with (utils/access.ts canView), or null when logged out. */
  accessTier: AccessTier | null;
  authData: AuthData | null;
  loading: boolean;
  login: (authData: AuthData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  /**
   * Apply what the store says about Plus for this email: a verified purchase or restore
   * unlocks it without a new login, a refund takes store-bought Plus away again.
   */
  setStorePlus: (ownsPlus: boolean, forEmail: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);
  // The latest session, for updates that finish after an await (store checks).
  const authRef = useRef<AuthData | null>(null);

  const checkAuthStatus = async () => {
    try {
      const storedAuth = await AsyncStorage.getItem('userAuth');
      if (storedAuth) {
        const parsedAuth: AuthData = JSON.parse(storedAuth);

        // Check if auth is less than 30 days old
        const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        const isRecent = Date.now() - parsedAuth.timestamp < thirtyDays;

        if (isRecent && parsedAuth.authenticated) {
          authRef.current = parsedAuth;
          setAuthData(parsedAuth);
          setIsAuthenticated(true);
        } else {
          // Auth is too old, clear it
          await AsyncStorage.removeItem('userAuth');
          authRef.current = null;
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
      authRef.current = newAuthData;
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
      authRef.current = null;
      setAuthData(null);
      setIsAuthenticated(false);
    }
  };

  const setStorePlus = useCallback(async (ownsPlus: boolean, forEmail: string) => {
    const current = authRef.current;
    // A store check that finishes after a logout, or after another email logged in, is stale.
    if (!current || normalizeEmail(current.email) !== normalizeEmail(forEmail)) return;
    const next = tierAfterStoreCheck(current, ownsPlus);
    if (!next) return;
    authRef.current = next;
    setAuthData(next);
    try {
      await AsyncStorage.setItem('userAuth', JSON.stringify(next));
    } catch (error) {
      console.error('Error storing auth data:', error);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const accessTier: AccessTier | null = isAuthenticated ? authData?.tier ?? 'member' : null;
  const isMember = accessTier === 'member';
  const hasPlus = hasPlusAccess(accessTier);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isMember,
      hasPlus,
      accessTier,
      authData,
      loading,
      login,
      logout,
      checkAuthStatus,
      setStorePlus,
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
