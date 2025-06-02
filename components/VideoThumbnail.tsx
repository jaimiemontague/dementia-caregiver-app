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
      // First, try with a proxy to handle CORS
      const proxyUrl = `https://cors-anywhere.herokuapp.com/${videoUrl}`;
      
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      // Try direct URL first, then proxy if it fails
      let videoLoaded = false;
      
      try {
        video.src = videoUrl;
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            videoLoaded = true;
            resolve(true);
          };
          video.onerror = reject;
          setTimeout(() => reject(new Error('Timeout')), 3000);
        });
      } catch (directError) {
        console.log('Direct video load failed, skipping proxy attempt due to CORS restrictions');
        // S3 videos often have CORS issues that can't be bypassed
        // For production, you'd need to configure CORS on your S3 bucket
        setError(true);
        return;
      }

      if (videoLoaded) {
        // Seek to 1 second
        video.currentTime = 1;
        
        // Wait for seek to complete
        await new Promise((resolve) => {
          video.onseeked = resolve;
          setTimeout(resolve, 1000); // Timeout after 1 second
        });

        // Create canvas and draw video frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setThumbnailUri(dataUrl);
        } else {
          setError(true);
        }
        
        // Clean up
        canvas.remove();
      }
      
      video.remove();
    } catch (err) {
      console.log('Error generating web thumbnail:', err);
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