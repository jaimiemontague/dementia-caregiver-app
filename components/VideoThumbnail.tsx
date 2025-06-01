import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';

interface VideoThumbnailProps {
  videoUrl: string;
  style?: any;
}

export default function VideoThumbnail({ videoUrl, style }: VideoThumbnailProps) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // For web, we'll create a video element to capture a frame
      generateWebThumbnail();
    } else {
      // For native, use expo-video-thumbnails
      generateNativeThumbnail();
    }
  }, [videoUrl]);

  const generateNativeThumbnail = async () => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(
        videoUrl,
        {
          time: 1000, // 1 second into the video
        }
      );
      setThumbnailUri(uri);
    } catch (err) {
      console.log('Error generating native thumbnail:', err);
      setError(true);
    }
  };

  const generateWebThumbnail = async () => {
    try {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      // Wait for video metadata to load
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        setTimeout(reject, 5000); // 5 second timeout
      });

      // Seek to 1 second
      video.currentTime = 1;
      
      // Wait for seek to complete
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });

      // Create canvas and draw video frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setThumbnailUri(dataUrl);
      } else {
        setError(true);
      }
      
      // Clean up
      video.remove();
      canvas.remove();
    } catch (err) {
      console.log('Error generating thumbnail:', err);
      setError(true);
    }
  };

  if (!error && thumbnailUri) {
    return (
      <Image 
        source={{ uri: thumbnailUri }} 
        style={[styles.thumbnail, style]}
        resizeMode="cover"
      />
    );
  }

  // Fallback to dark background
  return <View style={[styles.placeholder, style]} />;
}

const styles = StyleSheet.create({
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
  },
}); 