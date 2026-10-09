import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useRef, useCallback, useEffect } from 'react';
import CenteredContainer from '@/components/ui/CenteredContainer';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

import videoData from '../../../../data/videoData.json';
import { prettyBehavior } from '@/utils/search';
import { canView } from '@/utils/access';
import { PLUS_COPY } from '@/constants/plusCopy';
import CheatsheetCard, { type Cheatsheet } from '@/components/CheatsheetCard';

type VideoDataType = Record<string, Record<string, { videoUrl: string; prompt2?: string; tier?: string; cheatsheet?: Cheatsheet }>>;
const typedVideoData = videoData as VideoDataType;

export default function Page() {
  const { behavior, situation } = useLocalSearchParams();
  const router = useRouter();
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const { addRecentVideo } = useRecentlyViewed();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { accessTier } = useAuth();

  const behaviorKey = decodeURIComponent(behavior as string).toLowerCase();
  const situationKey = decodeURIComponent(situation as string).toLowerCase();

  const data = typedVideoData[behaviorKey]?.[situationKey];
  const isCurrentlyFavorite = isFavorite(behaviorKey, situationKey);
  // A member-layer video reached without Plus (a saved favorite, a link): no player, a way in instead.
  const locked = Boolean(data) && !canView(data, accessTier);

  const player = useVideoPlayer({ uri: !locked && data?.videoUrl ? data.videoUrl : '' });

  // Track video view when page loads with video data
  useEffect(() => {
    if (data && !locked && behavior && situation) {
      const behaviorTitle = prettyBehavior(behaviorKey);
      const situationTitle = situationKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      addRecentVideo({
        behavior: behaviorKey,
        situation: situationKey,
        videoUrl: data.videoUrl,
        title: behaviorTitle,
        situationTitle: situationTitle,
      });
    }
  }, [behaviorKey, situationKey, data, locked]);

  // Clean up video when navigating away
  useFocusEffect(
    useCallback(() => {
      // Play video when screen is focused (a locked video has no player source)
      if (player && !locked && Platform.OS !== 'web') {
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
          } catch {
            // Silently ignore cleanup errors as the player might already be released
          }
        }

        // Web video cleanup
        if (Platform.OS === 'web' && webVideoRef.current) {
          try {
            webVideoRef.current.pause();
            webVideoRef.current.currentTime = 0;
          } catch {
            // Silently ignore cleanup errors
          }
        }
      };
    }, [player, locked])
  );

  const handleToggleFavorite = () => {
    if (data) {
      const behaviorTitle = prettyBehavior(behaviorKey);
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

  if (locked) {
    return (
      <CenteredContainer>
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
          <Text style={[styles.title, styles.lockedSituation]}>
            {situationKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
          <View style={styles.lockedCard}>
            <Ionicons name="lock-closed-outline" size={30} color="#888" />
            <Text style={styles.lockedTitle}>{PLUS_COPY.lockedVideoTitle}</Text>
            <Text style={styles.lockedText}>{PLUS_COPY.includes}</Text>
            <TouchableOpacity style={styles.plusButton} onPress={() => router.push('/plus')} accessibilityRole="button">
              <Text style={styles.plusButtonText}>{PLUS_COPY.getPlus}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
          />
        )}

        {data.prompt2 && <Text style={styles.altPrompt}>{data.prompt2}</Text>}

        <CheatsheetCard cheatsheet={data.cheatsheet} />
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
  lockedSituation: {
    flex: 0,
    paddingRight: 0,
    marginBottom: 20,
  },
  lockedCard: {
    alignItems: 'center',
    backgroundColor: '#F6F6F6',
    borderColor: '#E2E2E2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  lockedText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  plusButton: {
    backgroundColor: '#FFA790',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  plusButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
