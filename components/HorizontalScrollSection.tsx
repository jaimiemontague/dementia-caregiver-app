import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HorizontalScrollSectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function HorizontalScrollSection({ title, subtitle, children }: HorizontalScrollSectionProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollViewWidth, setScrollViewWidth] = useState(0);

  const checkScrollPosition = () => {
    if (!scrollRef.current || Platform.OS !== 'web') return;

    // For web, we need to access the actual scroll position
    const scrollElement = (scrollRef.current as any).getScrollableNode?.();
    if (scrollElement) {
      const scrollLeft = scrollElement.scrollLeft;
      const maxScroll = contentWidth - scrollViewWidth;
      
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < maxScroll - 5);
    }
  };

  const scrollByCard = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    
    const cardWidth = 212; // 200px card + 12px margin
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
    
    if (Platform.OS === 'web') {
      const scrollElement = (scrollRef.current as any).getScrollableNode?.();
      if (scrollElement) {
        scrollElement.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    checkScrollPosition();
  }, [contentWidth, scrollViewWidth]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      
      <View style={styles.scrollContainer}>
        {Platform.OS === 'web' && canScrollLeft && (
          <TouchableOpacity 
            style={[styles.arrowButton, styles.leftArrow]} 
            onPress={() => scrollByCard('left')}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
        )}
        
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={checkScrollPosition}
          scrollEventThrottle={16}
          onContentSizeChange={(width) => {
            setContentWidth(width);
            checkScrollPosition();
          }}
          onLayout={(event) => {
            setScrollViewWidth(event.nativeEvent.layout.width);
            checkScrollPosition();
          }}
        >
          {children}
        </ScrollView>
        
        {Platform.OS === 'web' && canScrollRight && (
          <TouchableOpacity 
            style={[styles.arrowButton, styles.rightArrow]} 
            onPress={() => scrollByCard('right')}
          >
            <Ionicons name="chevron-forward" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 30,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    marginTop: -8,
  },
  scrollContainer: {
    position: 'relative',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingRight: 8,
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  leftArrow: {
    left: 10,
  },
  rightArrow: {
    right: 10,
  },
}); 