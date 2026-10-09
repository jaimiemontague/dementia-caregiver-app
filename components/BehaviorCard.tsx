import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import PlusBadge from './PlusBadge';

type Props = {
  title: string;
  onPress: () => void;
  selected?: boolean;
  /** A shelf only Plus opens: shows the Plus badge under the title. */
  locked?: boolean;
};

export default function BehaviorCard({ title, onPress, selected = false, locked = false }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, selected && styles.selected, locked && styles.locked]}
    >
      <Text style={styles.cardText}>{title}</Text>
      {locked && <PlusBadge />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFA790',
    borderRadius: 12,
    width: '45%',
    height: 60,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderWidth: 2,
    borderColor: '#FF7043', // Optional: highlight selected state
  },
  locked: {
    height: undefined,
    minHeight: 60,
    paddingVertical: 6,
    gap: 4,
  },
  cardText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
