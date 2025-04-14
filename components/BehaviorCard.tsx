import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type BehaviorCardProps = {
    title: string;
    onPress?: () => void;
    selected?: boolean;
  };

export default function BehaviorCard({ title, onPress, selected }: BehaviorCardProps) {
  return (
    <TouchableOpacity 
    style={[
        styles.card,
        selected ? styles.selected : styles.unselected
    ]}
    onPress={onPress}>
      <Text style={styles.cardText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#e6e6e6',
    borderRadius: 10,
  },
  cardText: {
    fontSize: 16,
  },
  unselected: {
    backgroundColor: 'white',
  },
  selected: {
    backgroundColor: 'lightgreen',
  },
});
