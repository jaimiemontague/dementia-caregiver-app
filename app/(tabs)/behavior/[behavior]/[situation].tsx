import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { useRef, useCallback } from 'react';
import CenteredContainer from '@/components/ui/CenteredContainer';

import videoData from '../../../../data/videoData.json';

type VideoDataType = Record<string, Record<string, { videoUrl: string; prompt2?: string }>>;
const typedVideoData = videoData as VideoDataType;

export default function Page() {
  const { behavior, situation } = useLocalSearchParams();
  const videoRef = useRef<Video>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);

  const behaviorKey = decodeURIComponent(behavior as string).toLowerCase();
  const situationKey = decodeURIComponent(situation as string).toLowerCase();

  const data = typedVideoData[behaviorKey]?.[situationKey];

  useFocusEffect(
    useCallback(() => {
      return () => {
        // Native video cleanup
        if (videoRef.current) {
          videoRef.current.stopAsync();
        }

        // Web video cleanup
        if (Platform.OS === 'web' && webVideoRef.current) {
          webVideoRef.current.pause();
          webVideoRef.current.currentTime = 0;
        }
      };
    }, [])
  );

  if (!data) {
    return (
      <CenteredContainer>
        <View style={styles.container}>
          <Text style={styles.title}>No video available for this situation.</Text>
        </View>
      </CenteredContainer>
    );
  }

  return (
    <CenteredContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
        <Text style={styles.title}>
          Watch this to help with {situationKey.replace(/-/g, ' ').toLowerCase()}:
        </Text>

        {Platform.OS === 'web' ? (
          <View style={styles.webVideoWrapper}>
            <video
              ref={webVideoRef}
              src={data.videoUrl}
              controls
              autoPlay
              style={styles.webVideo}
            />
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: data.videoUrl }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            style={styles.video}
          />
        )}

        {data.prompt2 && <Text style={styles.altPrompt}>{data.prompt2}</Text>}
      </ScrollView>
    </CenteredContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
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
  webVideoWrapper: {
    position: 'relative',
    width: '100%',
    paddingBottom: '177.78%', // 9:16 aspect ratio
    marginBottom: 20,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
