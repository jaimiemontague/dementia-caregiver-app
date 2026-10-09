import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import BehaviorCard from '../../components/BehaviorCard';
import RecentlyViewedCard from '../../components/RecentlyViewedCard';
import FavoriteCard from '../../components/FavoriteCard';
import HorizontalScrollSection from '../../components/HorizontalScrollSection';
import PlusBadge from '@/components/PlusBadge';
import CenteredContainer from '@/components/ui/CenteredContainer';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildSearchIndex, prettyBehavior, search, type SearchItem, type VideoData } from '@/utils/search';
import { canView, isPlusShelf } from '@/utils/access';
import { PLUS_COPY } from '@/constants/plusCopy';

import videoData from '../../data/videoData.json';

const typedVideoData = videoData as VideoData;
const behaviorKeys = Object.keys(videoData);

const behaviors = behaviorKeys.map((key, index) => ({
  id: index + 1,
  title: prettyBehavior(key),
  slug: key,
}));

export default function Page() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const router = useRouter();
  const { recentVideos, refreshRecentVideos } = useRecentlyViewed();
  const { favoriteVideos, refreshFavorites } = useFavorites();
  const { authData, logout, accessTier, hasPlus } = useAuth();
  const insets = useSafeAreaInsets();

  // Free users still see Plus videos and shelves (with a badge); tapping one opens the paywall.
  const isLocked = (item: SearchItem) => {
    if (!item.situation) return !hasPlus && isPlusShelf(typedVideoData[item.behavior]);
    const entry = typedVideoData[item.behavior]?.[item.situation];
    return Boolean(entry) && !canView(entry, accessTier);
  };

  // Refresh recent videos and favorites when screen is focused
  useFocusEffect(
    useCallback(() => {
      refreshRecentVideos();
      refreshFavorites();
    }, [])
  );

  // Search over situation labels, their keywords and the behavior names, with word-form
  // matching ("eating" finds "eat") and ranking by how directly each result matches.
  const searchIndex = useMemo(() => buildSearchIndex(typedVideoData), []);

  const suggestions = useMemo(() => search(searchIndex, query), [query, searchIndex]);

  const handleSelect = (item: { behavior: string; situation?: string }) => {
    if (item.situation) {
      router.push({
        pathname: '/(tabs)/behavior/[behavior]/[situation]',
        params: {
          behavior: item.behavior,
          situation: item.situation,
        },
      });
    } else {
      router.push({
        pathname: '/(tabs)/behavior/[behavior]',
        params: {
          behavior: item.behavior,
        },
      });
    }
  };

  return (
    <CenteredContainer>
    <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 72 }]}>
    <View style={styles.container}>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.instructions}>Type in this box to search:</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="A word like food, shower, keys or sundowning"
          style={styles.searchInput}
        />
      </View>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item, index) => {
            const locked = isLocked(item);
            return (
              <TouchableOpacity
                key={item.label + index}
                onPress={() => (locked ? router.push('/plus') : handleSelect(item))}
                style={[styles.suggestion, locked && styles.suggestionLocked]}
              >
                <Text style={locked ? styles.suggestionTextLocked : undefined}>{item.label}</Text>
                {locked && <PlusBadge />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Behavior Buttons */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructions}>
          Or, you can choose the challenging behavior you're getting:
        </Text>
      </View>

      <View style={styles.buttonGrid}>
        {behaviors.map((item) => {
          const locked = !hasPlus && isPlusShelf(typedVideoData[item.slug]);
          return (
            <BehaviorCard
              key={item.id}
              title={item.title}
              locked={locked}
              onPress={() => {
                setSelectedId(item.id);
                if (locked) {
                  router.push('/plus');
                  return;
                }
                router.push({
                  pathname: "/(tabs)/behavior/[behavior]",
                  params: {
                    behavior: item.slug,
                  },
                });
              }}
              selected={item.id === selectedId}
            />
          );
        })}
      </View>

      {/* Help Now Plus, for free users only */}
      {!hasPlus && !suggestions.length && (
        <TouchableOpacity
          style={styles.plusRow}
          onPress={() => router.push('/plus')}
          accessibilityRole="button"
          accessibilityLabel={PLUS_COPY.homeRowLabel}
        >
          <Ionicons name="lock-open-outline" size={22} color="#7A4A44" style={styles.plusRowIcon} />
          <View style={styles.plusRowText}>
            <Text style={styles.plusRowTitle}>{PLUS_COPY.homeRowTitle}</Text>
            <Text style={styles.plusRowDetail}>{PLUS_COPY.homeRowDetail}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      )}

      {/* Recently Viewed Section */}
      {recentVideos.length > 0 && !suggestions.length && (
        <View style={styles.recentlyViewedSection}>
          <HorizontalScrollSection 
            title="Recently Viewed" 
            subtitle="Tap to watch again"
          >
            {recentVideos.map((video, index) => (
              <RecentlyViewedCard key={`${video.behavior}-${video.situation}-${index}`} video={video} />
            ))}
          </HorizontalScrollSection>
        </View>
      )}

      {/* Favorites Section */}
      {favoriteVideos.length > 0 && !suggestions.length && (
        <View style={styles.favoritesSection}>
          <HorizontalScrollSection
            title="Favorites"
            subtitle="Your saved videos"
          >
            {favoriteVideos.map((video, index) => (
              <FavoriteCard key={`${video.behavior}-${video.situation}-${index}`} video={video} />
            ))}
          </HorizontalScrollSection>
        </View>
      )}

      {/* Log out: clears the saved login so another email can be used */}
      {!suggestions.length && (
        <View style={styles.logoutRow}>
          <Text style={styles.logoutEmail}>
            {authData?.email ? `Logged in as ${authData.email}` : ''}
          </Text>
          <TouchableOpacity
            onPress={async () => {
              await logout();
              router.replace('/login');
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.logoutLink}>Log out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View></ScrollView>
    </CenteredContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 16,
  },
  searchLabel: {
    marginRight: 8,
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchInput: {
    height: 44, // increased for more comfortable tap target
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    marginTop: 6,
  },
  suggestion: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  suggestionLocked: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionTextLocked: {
    flex: 1,
    paddingRight: 8,
    color: '#666',
  },
  plusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderColor: '#DAB2AC',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#FFF8F6',
  },
  plusRowIcon: {
    marginRight: 12,
  },
  plusRowText: {
    flex: 1,
  },
  plusRowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  plusRowDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  instructionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 0,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 20,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  suggestionsContainer: {
    flexGrow: 1,
    backgroundColor: '#FFF',
    borderColor: '#CCC',
    borderWidth: 1,
    borderRadius: 6,
    marginHorizontal: 16,
    marginTop: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxHeight: '80%',
  },
  searchContainer: {
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 10,
  },
  scrollContainer: {
    paddingBottom: 30,
    flexGrow: 1,
    backgroundColor: '#FFFFFF', 
  },
  recentlyViewedSection: {
    marginTop: 20,
  },
  favoritesSection: {
    marginTop: 0,
  },
  logoutRow: {
    marginTop: 36,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  logoutEmail: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
    textAlign: 'center',
  },
  logoutLink: {
    fontSize: 15,
    color: '#1e90ff',
    textDecorationLine: 'underline',
  },
});
