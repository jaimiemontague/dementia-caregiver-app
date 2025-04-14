import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { useRef, useCallback } from 'react';

const videoData: Record<string, Record<string, { videoUrl: string; prompt2?: string }>> = {
  'anger-or-aggression': {
    'cursing-or-yelling': {
      videoUrl: 'https://dementiacaregivingmadeeasy.s3.us-east-1.amazonaws.com/videos/258+Dementia+False+Belief-+Responding+to+_I+Need+To+Go+See+Grandma%2C+Im+Leaving_+(When+She+Passed+Years+Ago).mp4',
      prompt2: 'Try redirecting them with calm tone and eye contact.',
    },
    // Add the rest...You become the target
    'you-become-the-target': {
      videoUrl: 'https://dementiacaregivingmadeeasy.s3.us-east-1.amazonaws.com/videos/258+Dementia+False+Belief-+Responding+to+_I+Need+To+Go+See+Grandma%2C+Im+Leaving_+(When+She+Passed+Years+Ago).mp4',
      prompt2: 'Try redirecting them with calm tone and eye contact.',
    },
    'throws-things-or-slams-doors': {
      videoUrl: 'https://dementiacaregivingmadeeasy.s3.us-east-1.amazonaws.com/videos/258+Dementia+False+Belief-+Responding+to+_I+Need+To+Go+See+Grandma%2C+Im+Leaving_+(When+She+Passed+Years+Ago).mp4',
      prompt2: 'Try redirecting them with calm tone and eye contact.',
    },
  },
  // Add other behaviors here...
};

export default function Page() {
  const { behavior, situation } = useLocalSearchParams();
  const videoRef = useRef<Video>(null);

  const behaviorKey = decodeURIComponent(behavior as string).toLowerCase();
  const situationKey = decodeURIComponent(situation as string).toLowerCase();

  const data = videoData[behaviorKey]?.[situationKey];

  // Stop video when navigating away
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (videoRef.current) {
          videoRef.current.stopAsync();
        }
      };
    }, [])
  );

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No video available for this situation.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
      
      <Text style={styles.title}>Watch this to help with {situationKey.replace(/-/g, ' ')}:</Text>

      <Video
        ref={videoRef}
        source={{ uri: data.videoUrl }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        style={styles.video}
      />

      {data.prompt2 && <Text style={styles.altPrompt}>{data.prompt2}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    marginBottom: 16,
    color: '#333',
  },
  video: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 500,
    borderRadius: 12,
    backgroundColor: '#000',
    marginBottom: 20,
    alignSelf: 'center',
  },
  altPrompt: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
  },
});