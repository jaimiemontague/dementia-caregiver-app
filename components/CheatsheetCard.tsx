import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { PLUS_COPY } from '@/constants/plusCopy';
import { canView, type Cheatsheet } from '@/utils/access';

/** A printable PDF attached to a situation. Plus and members open it; free users see what Plus adds. */
export type { Cheatsheet } from '@/utils/access';

/** S3 keys carry spaces and ampersands; encode once, and leave an already-encoded URL alone. */
export function cheatsheetHref(url: string): string {
  return /%[0-9A-Fa-f]{2}/.test(url) ? url : encodeURI(url);
}

export default function CheatsheetCard({ cheatsheet }: { cheatsheet?: Cheatsheet | null }) {
  const { accessTier } = useAuth();
  const router = useRouter();
  if (!cheatsheet?.url || !cheatsheet.title) return null;

  if (canView(cheatsheet, accessTier)) {
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

  // Free tier: the sheet exists, and Plus opens it.
  return (
    <View style={[styles.card, styles.locked]}>
      <Ionicons name="lock-closed-outline" size={26} color="#888" style={styles.icon} />
      <View style={styles.textBlock}>
        <Text style={styles.label}>{PLUS_COPY.cheatsheetLabel}</Text>
        <Text style={styles.title}>{cheatsheet.title}</Text>
        <Text style={styles.hint}>{PLUS_COPY.cheatsheetLocked}</Text>
        <TouchableOpacity
          style={styles.plusButton}
          onPress={() => router.push('/plus')}
          accessibilityRole="button"
        >
          <Text style={styles.plusButtonText}>{PLUS_COPY.getPlus}</Text>
        </TouchableOpacity>
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
  plusButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFA790',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 12,
  },
  plusButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
