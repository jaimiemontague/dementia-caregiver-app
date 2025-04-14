import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  selected?: boolean;
};

export default function BehaviorCard({ title, onPress, selected = false }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
    >
      <Text style={styles.cardText}>{title}</Text>
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
  cardText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
