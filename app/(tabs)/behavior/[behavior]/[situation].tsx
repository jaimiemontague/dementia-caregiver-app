import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useFocusEffect } from '@react-navigation/native';
import { useRef, useCallback, useEffect } from 'react';
import CenteredContainer from '@/components/ui/CenteredContainer';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useFavorites } from '@/hooks/useFavorites';
import { Ionicons } from '@expo/vector-icons';

import videoData from '../../../../data/videoData.json';

type VideoDataType = Record<string, Record<string, { videoUrl: string; prompt2?: string }>>;
const typedVideoData = videoData as VideoDataType;

export default function Page() {
  const { behavior, situation } = useLocalSearchParams();
  const videoRef = useRef<any>(null);
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const { addRecentVideo } = useRecentlyViewed();
  const { toggleFavorite, isFavorite } = useFavorites();

  const behaviorKey = decodeURIComponent(behavior as string).toLowerCase();
  const situationKey = decodeURIComponent(situation as string).toLowerCase();

  const data = typedVideoData[behaviorKey]?.[situationKey];
  const isCurrentlyFavorite = isFavorite(behaviorKey, situationKey);

  const player = useVideoPlayer({ uri: data?.videoUrl || '' });

  // Track video view when page loads with video data
  useEffect(() => {
    if (data && behavior && situation) {
      const behaviorTitle = behaviorKey.replace(/-/g, ' ').replace(/!/g, '').replace(/\b\w/g, l => l.toUpperCase());
      const situationTitle = situationKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      addRecentVideo({
        behavior: behaviorKey,
        situation: situationKey,
        videoUrl: data.videoUrl,
        title: behaviorTitle,
        situationTitle: situationTitle,
      });
    }
  }, [behaviorKey, situationKey, data]);

  // Clean up video when navigating away
  useFocusEffect(
    useCallback(() => {
      // Play video when screen is focused
      if (player && Platform.OS !== 'web') {
        try {
          player.play();
        } catch (error) {
          console.log('Error playing video:', error);
        }
      }

      // Cleanup function runs when screen loses focus
      return () => {
        // Native video cleanup
        if (player && Platform.OS !== 'web') {
          try {
            // Only pause if the player is still valid
            if (player.status !== 'error' && player.currentTime !== undefined) {
              player.pause();
            }
          } catch (error) {
            // Silently ignore cleanup errors as the player might already be released
          }
        }

        // Web video cleanup
        if (Platform.OS === 'web' && webVideoRef.current) {
          try {
            webVideoRef.current.pause();
            webVideoRef.current.currentTime = 0;
          } catch (error) {
            // Silently ignore cleanup errors
          }
        }
      };
    }, [player])
  );

  const handleToggleFavorite = () => {
    if (data) {
      const behaviorTitle = behaviorKey.replace(/-/g, ' ').replace(/!/g, '').replace(/\b\w/g, l => l.toUpperCase());
      const situationTitle = situationKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      toggleFavorite({
        behavior: behaviorKey,
        situation: situationKey,
        videoUrl: data.videoUrl,
        title: behaviorTitle,
        situationTitle: situationTitle,
      });
    }
  };

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
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            Watch this to help with {situationKey.replace(/-/g, ' ').toLowerCase()}:
          </Text>
          <TouchableOpacity 
            onPress={handleToggleFavorite} 
            style={styles.favoriteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={isCurrentlyFavorite ? 'heart' : 'heart-outline'} 
              size={24} 
              color={isCurrentlyFavorite ? '#FF4458' : '#888'} 
            />
          </TouchableOpacity>
        </View>

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
          <VideoView
            player={player}
            nativeControls
            contentFit="contain"
            style={styles.video}
            allowsFullscreen
            allowsPictureInPicture
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    paddingRight: 10,
    lineHeight: 26,
  },
  favoriteButton: {
    padding: 4,
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
    lineHeight: 22,
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
