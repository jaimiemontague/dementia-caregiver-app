import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { useRef, useCallback } from 'react';

import videoData from '../../../../data/videoData.json'; 

type VideoDataType = Record<string, Record<string, { videoUrl: string; prompt2?: string }>>;
const typedVideoData = videoData as VideoDataType;

export default function Page() {
  const { behavior, situation } = useLocalSearchParams();
  const videoRef = useRef<Video>(null);

  const behaviorKey = decodeURIComponent(behavior as string).toLowerCase();
  const situationKey = decodeURIComponent(situation as string).toLowerCase();

  const data = typedVideoData[behaviorKey]?.[situationKey];

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
      <Text style={styles.title}>Watch this to help with {situationKey.replace(/-/g, ' ').toLowerCase()}:</Text>

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