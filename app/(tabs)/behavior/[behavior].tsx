import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import videoData from '../../../data/videoData.json';

type VideoDataType = Record<string, Record<string, { videoUrl: string; prompt2?: string }>>;
const typedVideoData = videoData as VideoDataType;

export default function Page() {
  const router = useRouter();
  const { behavior } = useLocalSearchParams();

  const normalizedBehavior = decodeURIComponent(behavior as string).toLowerCase();
  const situations = Object.keys(typedVideoData[normalizedBehavior] || {});

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {normalizedBehavior.replace(/-/g, ' ')}: Choose the specific situation you're dealing with.
      </Text>

      {situations.map((situationKey, index) => (
        <TouchableOpacity
          key={index}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/behavior/[behavior]/[situation]",
              params: {
                behavior: behavior as string,
                situation: situationKey,
              },
            })
          }
        >
          <Text style={styles.cardText}>
            {situationKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    fontSize: 20,
    marginBottom: 24,
    textTransform: 'capitalize',
    color: '#333',
  },
  card: {
    backgroundColor: '#FFA790',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});
