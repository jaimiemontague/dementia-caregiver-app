import { View, Text, ScrollView, StyleSheet } from 'react-native';
import BehaviorCard from '../components/BehaviorCard';
import { useState } from 'react';


const behaviors = [
  { id: 1, title: "I Want to Go Home!" },
  { id: 2, title: "Sundowning" },
  { id: 3, title: "Anger or Aggression" },
];

export default function HomeScreen() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Challenging Dementia Behaviors</Text>
      <ScrollView>
        {behaviors.map((item) => (
          <BehaviorCard
            key={item.id}
            title={item.title}
            onPress={() => {
              setSelectedId(item.id);
            }}
            selected={item.id === selectedId}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  
});
