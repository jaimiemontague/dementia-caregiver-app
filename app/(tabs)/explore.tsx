import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import CenteredContainer from '@/components/ui/CenteredContainer';

export default function TabTwoScreen() {
  return (
    <CenteredContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Explore</Text>
          </View>
          <ThemedText>This app includes example code to help you get started.</ThemedText>
          <Collapsible title="File-based routing">
            <ThemedText>
              This app has two screens:{' '}
              <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> and{' '}
              <ThemedText type="defaultSemiBold">app/(tabs)/explore.tsx</ThemedText>
            </ThemedText>
            <ThemedText>
              The layout file in <ThemedText type="defaultSemiBold">app/(tabs)/_layout.tsx</ThemedText>{' '}
              sets up the tab navigator.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/router/introduction">
              <ThemedText type="link">Learn more</ThemedText>
            </ExternalLink>
          </Collapsible>
          <Collapsible title="Android, iOS, and web support">
            <ThemedText>
              You can open this project on Android, iOS, and the web. To open the web version, press{' '}
              <ThemedText type="defaultSemiBold">w</ThemedText> in the terminal running this project.
            </ThemedText>
          </Collapsible>
          <Collapsible title="Custom fonts">
            <ThemedText>
              Open <ThemedText type="defaultSemiBold">app/_layout.tsx</ThemedText> to see how to load{' '}
              <ThemedText style={{ fontFamily: 'SpaceMono' }}>
                custom fonts such as this one.
              </ThemedText>
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/versions/latest/sdk/font">
              <ThemedText type="link">Learn more</ThemedText>
            </ExternalLink>
          </Collapsible>
          <Collapsible title="Light and dark mode components">
            <ThemedText>
              This template has light and dark mode support. The{' '}
              <ThemedText type="defaultSemiBold">useColorScheme()</ThemedText> hook lets you inspect
              what the user's current color scheme is, and so you can adjust UI colors accordingly.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
              <ThemedText type="link">Learn more</ThemedText>
            </ExternalLink>
          </Collapsible>
        </View>
      </ScrollView>
    </CenteredContainer>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingBottom: 40,
  },
  container: {
    padding: 20,
    paddingTop: 30,
    backgroundColor: '#fff',
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
});
