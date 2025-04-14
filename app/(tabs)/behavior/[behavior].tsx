import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Fake example data (normally you'd pull this from your behavior database)
const situationData: Record<string, string[]> = {
  'sundowning': [
    'Wants to go home',  // https://www.youtube.com/shorts/aRzM4gzlQ7w
    'Thinks they have to go to work', // https://www.youtube.com/shorts/NfhsDluXWDs
    'Refuses to sit down or sleep', // https://www.youtube.com/shorts/cQlXDeeloDw
  ],
  'i-want-to-go-home': [
    'Keeps trying to leave the house', // https://www.youtube.com/shorts/rZa4MV9c_yQ
    'Asks repeatedly to go home', // https://www.youtube.com/shorts/kSKBxtrG-3Q
    'Wants to go to mom’s house (who passed away)', // https://www.youtube.com/shorts/jfFDlr_6RPo
  ],
  'anger-or-aggression': [
    'Cursing or yelling', // https://www.youtube.com/shorts/mA5q7243fTw
    'You become the target', // https://www.youtube.com/shorts/dKfGrQCzEmA
    'Throws things or slams doors', // https://www.youtube.com/shorts/wiTJ7cAqqGI
  ],
};

export default function Page() {
  const router = useRouter();
  const { behavior } = useLocalSearchParams();

  const normalizedBehavior = decodeURIComponent(behavior as string);
  const situations = situationData[normalizedBehavior.toLowerCase()] || [];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
      {normalizedBehavior.replace(/-/g, ' ')}
    : Choose the specific situation you're dealing with.
      </Text>

      {situations.map((situation, index) => (
        <TouchableOpacity
          key={index}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/behavior/[behavior]/[situation]",
              params: {
                behavior: behavior as string,
                situation: situation.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
              },
            })
          }
        >
          <Text style={styles.cardText}>{situation}</Text>
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