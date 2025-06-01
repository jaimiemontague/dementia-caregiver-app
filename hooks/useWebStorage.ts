import { Platform } from 'react-native';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Lazy load AsyncStorage only when needed
let AsyncStorage: any = null;
if (Platform.OS !== 'web') {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

// Create a cross-platform storage solution
class WebStorage {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      if (!isBrowser) {
        return null; // Return null during SSR
      }
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
      }
    } else {
      return AsyncStorage?.getItem(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (!isBrowser) {
        return; // Skip during SSR
      }
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    } else {
      return AsyncStorage?.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (!isBrowser) {
        return; // Skip during SSR
      }
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    } else {
      return AsyncStorage?.removeItem(key);
    }
  }
}

export const Storage = new WebStorage(); 