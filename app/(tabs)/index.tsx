import { View, Text, StyleSheet, Image, TextInput, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import BehaviorCard from '../../components/BehaviorCard';
import CenteredContainer from '@/components/ui/CenteredContainer';

import videoData from '../../data/videoData.json';

const behaviorKeys = Object.keys(videoData);

const behaviors = behaviorKeys.map((key, index) => ({
  id: index + 1,
  title: key.replace(/-/g, ' ').replace(/!/g, '').replace(/\b\w/g, l => l.toUpperCase()),
  slug: key,
}));

export default function Page() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    { label: string; behavior: string; situation?: string }[]
  >([]);

  const router = useRouter();

  // Build a global search index
  const searchIndex = useMemo(() => {
    const index: { label: string; behavior: string; situation?: string }[] = [];

    for (const [behavior, situations] of Object.entries(videoData)) {
      index.push({ label: behavior, behavior });

      for (const situation of Object.keys(situations)) {
        index.push({
          label: `${behavior} → ${situation}`,
          behavior,
          situation,
        });
      }
    }

    return index;
  }, []);

  // Filter suggestions on query change
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const filtered = searchIndex.filter(item =>
      item.label.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(filtered);
  }, [query, searchIndex]);

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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
    <View style={styles.container}>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.instructions}>Type in this box to search:</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Type behavior or situation"
          style={styles.searchInput}
        />
      </View>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={item.label + index}
              onPress={() => handleSelect(item)}
              style={styles.suggestion}
            >
              <Text>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}


      {/* Behavior Buttons */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructions}>
          Or, you can choose the challenging behavior you're getting:
        </Text>
      </View>

      <View style={styles.buttonGrid}>
        {behaviors.map((item) => (
          <BehaviorCard
            key={item.id}
            title={item.title}
            onPress={() => {
              setSelectedId(item.id);
              router.push({
                pathname: "/(tabs)/behavior/[behavior]",
                params: {
                  behavior: item.slug,
                },
              });
            }}
            selected={item.id === selectedId}
          />
        ))}
      </View>
    </View></ScrollView>
    </CenteredContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#DAB2AC',
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 60,
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

});
