import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENTLY_VIEWED_KEY = 'recently_viewed_videos';
const MAX_RECENT_VIDEOS = 10;

export interface RecentVideo {
  behavior: string;
  situation: string;
  videoUrl: string;
  timestamp: number;
  title: string;
  situationTitle: string;
}

export const useRecentlyViewed = () => {
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);

  // Load recently viewed videos on mount
  useEffect(() => {
    loadRecentVideos();
  }, []);

  const loadRecentVideos = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
      if (stored) {
        const videos = JSON.parse(stored) as RecentVideo[];
        setRecentVideos(videos);
      }
    } catch (error) {
      console.error('Error loading recent videos:', error);
    }
  };

  const addRecentVideo = async (video: Omit<RecentVideo, 'timestamp'>) => {
    try {
      const newVideo: RecentVideo = {
        ...video,
        timestamp: Date.now(),
      };

      // Get existing videos
      const stored = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
      let videos: RecentVideo[] = stored ? JSON.parse(stored) : [];

      // Remove if already exists (to avoid duplicates)
      videos = videos.filter(
        v => !(v.behavior === video.behavior && v.situation === video.situation)
      );

      // Add new video at the beginning
      videos.unshift(newVideo);

      // Keep only the most recent videos
      videos = videos.slice(0, MAX_RECENT_VIDEOS);

      // Save to storage
      await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(videos));
      setRecentVideos(videos);
    } catch (error) {
      console.error('Error saving recent video:', error);
    }
  };

  const clearRecentVideos = async () => {
    try {
      await AsyncStorage.removeItem(RECENTLY_VIEWED_KEY);
      setRecentVideos([]);
    } catch (error) {
      console.error('Error clearing recent videos:', error);
    }
  };

  return {
    recentVideos,
    addRecentVideo,
    clearRecentVideos,
    refreshRecentVideos: loadRecentVideos,
  };
}; 