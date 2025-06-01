import { useEffect, useState } from 'react';
import { Storage } from './useWebStorage';

const FAVORITES_KEY = 'favorite_videos';

export interface FavoriteVideo {
  behavior: string;
  situation: string;
  videoUrl: string;
  title: string;
  situationTitle: string;
  timestamp: number; // When it was favorited
}

export const useFavorites = () => {
  const [favoriteVideos, setFavoriteVideos] = useState<FavoriteVideo[]>([]);

  // Load favorite videos on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await Storage.getItem(FAVORITES_KEY);
      if (stored) {
        const videos = JSON.parse(stored) as FavoriteVideo[];
        setFavoriteVideos(videos);
      }
    } catch (error) {
      console.error('Error loading favorite videos:', error);
    }
  };

  const toggleFavorite = async (video: Omit<FavoriteVideo, 'timestamp'>) => {
    try {
      const stored = await Storage.getItem(FAVORITES_KEY);
      let favorites: FavoriteVideo[] = stored ? JSON.parse(stored) : [];

      // Check if already favorited
      const existingIndex = favorites.findIndex(
        f => f.behavior === video.behavior && f.situation === video.situation
      );

      if (existingIndex >= 0) {
        // Remove from favorites
        favorites.splice(existingIndex, 1);
      } else {
        // Add to favorites
        const newFavorite: FavoriteVideo = {
          ...video,
          timestamp: Date.now(),
        };
        favorites.unshift(newFavorite);
      }

      // Save to storage
      await Storage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      setFavoriteVideos(favorites);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const isFavorite = (behavior: string, situation: string): boolean => {
    return favoriteVideos.some(
      f => f.behavior === behavior && f.situation === situation
    );
  };

  const clearFavorites = async () => {
    try {
      await Storage.removeItem(FAVORITES_KEY);
      setFavoriteVideos([]);
    } catch (error) {
      console.error('Error clearing favorites:', error);
    }
  };

  return {
    favoriteVideos,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    refreshFavorites: loadFavorites,
  };
}; 