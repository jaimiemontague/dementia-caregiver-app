import React from 'react';
import { View, Text, StyleSheet, Linking, TextInput, Alert, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import CenteredContainer from '@/components/ui/CenteredContainer';

export default function HelpNowScreen() {
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSendEmail = () => {
    if (!message.trim()) {
      Alert.alert("Empty Message", "Please enter a message before sending.");
      return;
    }

    const subject = encodeURIComponent("Help Now Request From Your Customer");
    const body = encodeURIComponent(message);
    const mailtoLink = `mailto:kristamesenbrink@dementiasuccesspath.com?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoLink);

    Alert.alert(
      "Message Ready to Send!",
      "Your email app should have opened. Just hit send to complete it!",
      [{ text: "OK" }]
    );

    setMessage('');
  };

  return (
    <CenteredContainer>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.header}>Welcome to "Help Now!"</Text>

          <Text style={styles.text}>To get the most out of the app:</Text>
          <Text style={styles.bullet}>
            1- Use the{' '}
            <Text style={styles.linkInline} onPress={() => router.back()}>
              Home page
            </Text>{' '}
            to find the challenging behavior you're facing
          </Text>

          <Text style={styles.bullet}>
            2- Tap a situation to see short, practical videos for what to do in the moment
          </Text>

          <Text style={[styles.text, { marginTop: 20 }]}>
            Still stuck? Ask your question here:
          </Text>

          <Text
            style={styles.linkText}
            onPress={() => Linking.openURL('https://www.facebook.com/groups/1400085963678016')}
          >
            → Post in the Members-Only Facebook Group (best for fast answers!)
          </Text>

          {Platform.OS === 'web' ? (
            <Text style={styles.text}>
              Or email Krista directly by emailing kristamesenbrink@dementiasuccesspath.com and put in the subject line:{" "}
              <Text style={{ fontStyle: 'italic' }}>"Your customer needs help now!"</Text>
              {'\n\n'}This is a specific subject line we use to prioritize requests. She will normally get back to you within 24 hours.
            </Text>
          ) : (
            <>
              <Text style={styles.textnobottom}>
                Or email Krista directly. She usually replies within 24 hours. You can use the form below (this will open your email app with a subject line that lets Krista know you're a customer needing help now.)
              </Text>

              <Text style={styles.subheader}>Your Message:</Text>
              <TextInput
                style={[styles.textInput, { height: 160 }]}
                multiline
                numberOfLines={8}
                placeholder="Type your question or message here..."
                value={message}
                onChangeText={setMessage}
              />

              <TouchableOpacity style={styles.sendButton} onPress={handleSendEmail}>
                <Text style={styles.sendButtonText}>Send Email</Text>
              </TouchableOpacity>
            </>
          )}
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
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  subheader: {
    marginTop: 30,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  text: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 4,
    color: '#333',
    lineHeight: 22,
  },
  textnobottom: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  textnotop: {
    fontSize: 16,
    marginBottom: 4,
    color: '#333',
    lineHeight: 22,
  },
  bullet: {
    fontSize: 16,
    marginLeft: 10,
    marginTop: 4,
    color: '#333',
    lineHeight: 22,
  },
  linkText: {
    color: '#1e90ff',
    fontSize: 16,
    marginVertical: 10,
    textDecorationLine: 'underline',
  },
  textInput: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#FFA790',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  linkInline: {
    color: '#1e90ff',
    textDecorationLine: 'underline',
  },
});
