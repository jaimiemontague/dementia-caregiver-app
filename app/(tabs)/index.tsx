import { View, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import BehaviorCard from '../../components/BehaviorCard';

const behaviors = [
  { id: 1, title: "I Want to Go Home!" },
  { id: 2, title: "Sundowning" },
  { id: 3, title: "Anger or Aggression" },
];

export default function Page() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Logo Header */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/appheader.png')} // Update path if needed
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Behavior Buttons */}
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
});