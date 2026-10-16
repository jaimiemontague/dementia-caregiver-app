import { StyleSheet, Text } from 'react-native';
import { PLUS_COPY } from '@/constants/plusCopy';

/**
 * What the paywall shows where there is no store to buy from. In the phone apps that only
 * happens in Expo Go or a build without the store module, so a short note is enough. The
 * web app has its own version, PlusPreviewNotice.web.tsx, which sends people to the phone
 * app; the store builds never include it.
 */
export default function PlusPreviewNotice() {
  return <Text style={styles.notice}>{PLUS_COPY.preview}</Text>;
}

const styles = StyleSheet.create({
  notice: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    backgroundColor: '#F6F6F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
});
