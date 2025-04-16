import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import BehaviorCard from '../../components/BehaviorCard';

import videoData from '../../data/videoData.json';

const behaviorKeys = Object.keys(videoData);

const behaviors = behaviorKeys.map((key, index) => ({
  id: index + 1,
  title: key.replace(/-/g, ' ').replace(/!/g, '').replace(/\b\w/g, l => l.toUpperCase()),
  slug: key,
}));

export default function Page() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const router = useRouter();

  return (
    <View style={styles.container}>

      {/* Behavior Buttons */}

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructions}>
          Choose the challenging behavior you're facing
        </Text>
      </View>

      <View style={styles.buttonGrid}>
        {behaviors.map((item) => (
          <BehaviorCard
            key={item.id}
            title={item.title}
            onPress={() => {
              setSelectedId(item.id);
              router.push({
                pathname: "/(tabs)/behavior/[behavior]",
                params: {
                  behavior: item.title.toLowerCase().replace(/\s+/g, '-'),
                },
              });
            }}
            selected={item.id === selectedId}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#DAB2AC',
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 60,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  instructionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
});