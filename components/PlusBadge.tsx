import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PLUS_COPY } from '@/constants/plusCopy';

/** The small "Plus" tag on videos and shelves a free user can see but not open yet. */
export default function PlusBadge() {
  return (
    <View style={styles.badge} accessible accessibilityLabel={PLUS_COPY.badgeLabel}>
      <Ionicons name="lock-closed" size={11} color="#7A4A44" style={styles.icon} />
      <Text style={styles.text}>{PLUS_COPY.badge}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DAB2AC',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  icon: {
    marginRight: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A4A44',
  },
});
