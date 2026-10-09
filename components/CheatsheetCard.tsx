import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

/** A printable PDF attached to a situation. Members open it; free users see what they're missing. */
export type Cheatsheet = { title: string; url: string };

const MEMBERSHIP_URL = 'https://dementiasuccesspath.com/dementia-caregiving-made-easy';

/** S3 keys carry spaces and ampersands; encode once, and leave an already-encoded URL alone. */
export function cheatsheetHref(url: string): string {
  return /%[0-9A-Fa-f]{2}/.test(url) ? url : encodeURI(url);
}

export default function CheatsheetCard({ cheatsheet }: { cheatsheet?: Cheatsheet | null }) {
  const { isMember } = useAuth();
  if (!cheatsheet?.url || !cheatsheet.title) return null;

  if (isMember) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => Linking.openURL(cheatsheetHref(cheatsheet.url))}
        accessibilityRole="link"
        accessibilityLabel={`Open the cheat sheet ${cheatsheet.title}`}
      >
        <Ionicons name="document-text-outline" size={26} color="#1e90ff" style={styles.icon} />
        <View style={styles.textBlock}>
          <Text style={styles.label}>Cheat sheet for this situation</Text>
          <Text style={styles.title}>{cheatsheet.title}</Text>
          <Text style={styles.hint}>Tap to open the PDF. You can print it or save it.</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Free tier: the sheet exists, but it comes with the membership.
  return (
    <View style={[styles.card, styles.locked]}>
      <Ionicons name="lock-closed-outline" size={26} color="#888" style={styles.icon} />
      <View style={styles.textBlock}>
        <Text style={styles.label}>Members get a printable cheat sheet for this situation</Text>
        <Text style={styles.title}>{cheatsheet.title}</Text>
        {Platform.OS !== 'ios' && (
          <Text style={styles.link} onPress={() => Linking.openURL(MEMBERSHIP_URL)}>
            Learn about the membership
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F2F8FF',
    borderColor: '#CFE3FA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  locked: {
    backgroundColor: '#F6F6F6',
    borderColor: '#E2E2E2',
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    lineHeight: 22,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  link: {
    fontSize: 15,
    color: '#1e90ff',
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});
