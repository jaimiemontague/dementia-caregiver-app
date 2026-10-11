import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import CenteredContainer from '@/components/ui/CenteredContainer';
import PlusBadge from '@/components/PlusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { canView } from '@/utils/access';
import { prettyBehavior, situationTitle } from '@/utils/search';

import videoData from '../../../data/videoData.json';
type VideoDataType = Record<string, Record<string, { videoUrl: string; prompt2?: string; tier?: string; label?: string }>>;
const typedVideoData = videoData as VideoDataType;

export default function Page() {
  const router = useRouter();
  const { behavior } = useLocalSearchParams();
  const { accessTier } = useAuth();

  const normalizedBehavior = decodeURIComponent(behavior as string).toLowerCase();
  const situationData = typedVideoData[normalizedBehavior] || {};
  const situations = Object.keys(situationData);

  return (
    <CenteredContainer>
    <ScrollView contentContainerStyle={styles.scrollContainer}>
    <View style={styles.container}>
      <Text style={styles.header}>
        {prettyBehavior(normalizedBehavior).toLowerCase()}: Choose the specific situation you're dealing with.
      </Text>

      {situations.map((situationKey, index) => {
        // Member-layer videos stay listed for free users, with a Plus badge, and open the paywall.
        const locked = !canView(situationData[situationKey], accessTier);
        return (
          <TouchableOpacity
            key={index}
            style={[styles.card, locked && styles.cardLocked]}
            onPress={() =>
              locked
                ? router.push('/plus')
                : router.push({
                    pathname: "/(tabs)/behavior/[behavior]/[situation]",
                    params: {
                      behavior: behavior as string,
                      situation: situationKey,
                    },
                  })
            }
          >
            <Text style={[styles.cardText, locked && styles.cardTextLocked]}>
              {situationTitle(situationKey, situationData[situationKey])}
            </Text>
            {locked && <PlusBadge />}
          </TouchableOpacity>
        );
      })}
    </View>
    </ScrollView>
    </CenteredContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textTransform: 'capitalize',
    color: '#333',
    textAlign: 'center',
    lineHeight: 30,
  },
  card: {
    backgroundColor: '#FFA790',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  cardLocked: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  cardTextLocked: {
    flex: 1,
    paddingRight: 8,
  },
  scrollContainer: {
    paddingBottom: 30,
    flexGrow: 1,
    backgroundColor: '#FFFFFF', 
  },
  situationButton: {
    backgroundColor: '#FFA790',
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  situationText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});
