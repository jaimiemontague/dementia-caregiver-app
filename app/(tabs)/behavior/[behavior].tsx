import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

// 👇 Behavior → Situation mock mapping
const situationMap: Record<string, string[]> = {
  sundowning: [
    "Getting fidgety, unstable, irritable",
    "Wants to go home in the afternoons",
    "Gets wild and crazy",
  ],
  anger: [
    "Explosive reaction to 'no'",
    "Yelling during meals",
    "Won’t stop pacing",
  ],
};

export default function SituationListScreen() {
  const { behavior } = useLocalSearchParams();
  const router = useRouter();

  const behaviorKey = behavior as string;
  const situations = situationMap[behaviorKey] || [];

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: "bold", marginBottom: 20 }}>
        {behaviorKey.charAt(0).toUpperCase() + behaviorKey.slice(1)}
      </Text>

      {situations.map((situation, index) => (
        <TouchableOpacity
          key={index}
          style={{
            padding: 16,
            backgroundColor: "#f0f0f0",
            borderRadius: 8,
            marginBottom: 12,
          }}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/behavior/[behavior]/[situation]",
              params: {
                behavior: behaviorKey,
                situation,
              },
            })
          }
        >
          <Text style={{ fontSize: 18 }}>{situation}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
