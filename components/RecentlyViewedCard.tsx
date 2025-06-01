import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { RecentVideo } from '../hooks/useRecentlyViewed';

interface RecentlyViewedCardProps {
  video: RecentVideo;
}

// Helper function to format time ago
const getTimeAgo = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export default function RecentlyViewedCard({ video }: RecentlyViewedCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/(tabs)/behavior/[behavior]/[situation]',
      params: {
        behavior: video.behavior,
        situation: video.situation,
      },
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.card}>
      <View style={styles.videoThumbnail}>
        <View style={styles.playButton}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
        <Text style={styles.timeAgo}>{getTimeAgo(video.timestamp)}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text numberOfLines={1} style={styles.behaviorTitle}>
          {video.title}
        </Text>
        <Text numberOfLines={2} style={styles.situationTitle}>
          {video.situationTitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  videoThumbnail: {
    height: 120,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
    color: '#2A2A2A',
    marginLeft: 3,
  },
  timeAgo: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    color: '#FFF',
  },
  textContainer: {
    padding: 12,
  },
  behaviorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  situationTitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
}); 