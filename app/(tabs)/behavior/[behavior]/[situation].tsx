import React from 'react';
import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function SituationDetailScreen() {
  // Grab the route params: "behavior" and "situation"
  const { behavior, situation } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{`Behavior: ${behavior}`}</Text>
      <Text style={styles.subHeader}>{`Situation: ${situation}`}</Text>
      <Text style={styles.content}>
        This is where the video and guidance content will eventually go.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subHeader: {
    fontSize: 20,
    marginBottom: 10,
  },
  content: {
    fontSize: 16,
  },
});