import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

/**
 * The web app's paywall. There is no store here, so it says plainly that Plus is bought in
 * the phone app and links to both store listings (Jaimie, October 15, 2026; buying on the
 * web may come later). Only the web build includes this file, which keeps the other
 * store's link and these words out of the store apps (plusCopy.ts has the App Review rule).
 *
 * A store purchase doesn't unlock Plus here: the web login gets Plus only from the
 * `App Plus` tag in Kartra or Mailchimp.
 */
export const PLUS_WEB_COPY = {
  heading: 'Get Plus in the phone app',
  steps:
    'Plus is bought in the free Dementia Help Now app for iPhone, iPad and Android. Download the app, log in with the same email you use here, and tap Get Plus.',
  appStore: 'App Store (iPhone and iPad)',
  googlePlay: 'Google Play (Android)',
};

export const PLUS_STORE_LINKS = {
  appStore: 'https://apps.apple.com/us/app/dementia-help-now/id6748661448',
  googlePlay: 'https://play.google.com/store/apps/details?id=com.dementiasuccesspath.dementiahelpnow',
};

export default function PlusPreviewNotice() {
  return (
    <View style={styles.box}>
      <Text style={styles.heading}>{PLUS_WEB_COPY.heading}</Text>
      <Text style={styles.steps}>{PLUS_WEB_COPY.steps}</Text>
      <TouchableOpacity style={styles.storeButton} onPress={() => WebBrowser.openBrowserAsync(PLUS_STORE_LINKS.appStore)} accessibilityRole="link">
        <Ionicons name="logo-apple" size={22} color="#fff" />
        <Text style={styles.storeButtonText}>{PLUS_WEB_COPY.appStore}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.storeButton} onPress={() => WebBrowser.openBrowserAsync(PLUS_STORE_LINKS.googlePlay)} accessibilityRole="link">
        <Ionicons name="logo-google-playstore" size={20} color="#fff" />
        <Text style={styles.storeButtonText}>{PLUS_WEB_COPY.googlePlay}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  steps: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  storeButton: {
    width: '100%',
    minHeight: 50,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFA790',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  storeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
