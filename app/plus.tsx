import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CenteredContainer from '@/components/ui/CenteredContainer';
import { useAuth } from '@/contexts/AuthContext';
import { usePlus, type PlusOutcome } from '@/contexts/PlusContext';
import { PLUS_COPY, PLUS_LINKS, withPrice } from '@/constants/plusCopy';

/**
 * The Help Now Plus paywall. Plus is sold here and nowhere else in the app: one
 * non-consumable store purchase at the price this caregiver is assigned (the store's own
 * price string, never typed in), plus Restore purchases. Opened from the locked cheat sheet
 * card, member-layer videos and shelves, and the Plus row on Home; members and Plus buyers
 * only land here through a saved link, and see that they already have it.
 */

const OUTCOME_MESSAGES: Partial<Record<PlusOutcome, string>> = {
  'nothing-to-restore': PLUS_COPY.nothingToRestore,
  pending: PLUS_COPY.pending,
  'not-allowed': PLUS_COPY.notAllowed,
  network: PLUS_COPY.network,
  failed: PLUS_COPY.failed,
  unavailable: PLUS_COPY.unavailable,
};

export default function PlusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hasPlus } = useAuth();
  const { support, product, price, priceStatus, busy, loadPrice, buy, restore } = usePlus();
  const [outcome, setOutcome] = useState<PlusOutcome | null>(null);

  useEffect(() => {
    if (!hasPlus && product) loadPrice();
  }, [hasPlus, product, loadPrice]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const run = async (action: () => Promise<PlusOutcome>) => {
    setOutcome(null);
    setOutcome(await action());
  };

  const termsUrl = Platform.OS === 'ios' ? PLUS_LINKS.termsIos : Platform.OS === 'android' ? PLUS_LINKS.termsAndroid : null;
  const message = outcome ? OUTCOME_MESSAGES[outcome] : undefined;

  const renderPurchase = () => {
    if (support === 'preview') return <Text style={styles.notice}>{PLUS_COPY.preview}</Text>;
    if (support === 'unavailable') return <Text style={styles.notice}>{PLUS_COPY.unavailable}</Text>;

    return (
      <>
        {priceStatus === 'failed' ? (
          <View style={styles.priceBlock}>
            <Text style={styles.notice}>{PLUS_COPY.priceFailed}</Text>
            <TouchableOpacity onPress={loadPrice} accessibilityRole="button" style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{PLUS_COPY.retry}</Text>
            </TouchableOpacity>
          </View>
        ) : priceStatus === 'loaded' && price ? (
          <TouchableOpacity
            style={[styles.buyButton, busy && styles.buttonDisabled]}
            onPress={() => run(buy)}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyButtonText}>{withPrice(PLUS_COPY.buyButton, price)}</Text>}
          </TouchableOpacity>
        ) : (
          <View style={styles.priceBlock}>
            <ActivityIndicator color="#FFA790" />
            <Text style={styles.small}>{PLUS_COPY.loadingPrice}</Text>
          </View>
        )}

        <Text style={styles.small}>{PLUS_COPY.oneTime}</Text>
        <Text style={styles.small}>{Platform.OS === 'ios' ? PLUS_COPY.chargedIos : PLUS_COPY.chargedAndroid}</Text>

        <TouchableOpacity onPress={() => run(restore)} disabled={busy} accessibilityRole="button" style={styles.restore}>
          <Text style={styles.link}>{PLUS_COPY.restore}</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <CenteredContainer>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.closeRow}>
          <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel={PLUS_COPY.close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color="#555" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{PLUS_COPY.name}</Text>

        {hasPlus ? (
          <View style={styles.section}>
            <Ionicons name="checkmark-circle" size={44} color="#4CAF50" style={styles.doneIcon} />
            <Text style={styles.heading}>
              {outcome === 'purchased' ? PLUS_COPY.purchased : outcome === 'restored' ? PLUS_COPY.restored : PLUS_COPY.owned}
            </Text>
            <Text style={styles.body}>{PLUS_COPY.ownedDetail}</Text>
            <TouchableOpacity style={styles.buyButton} onPress={close} accessibilityRole="button">
              <Text style={styles.buyButtonText}>{PLUS_COPY.startWatching}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.promise}>{PLUS_COPY.promise}</Text>
            <Text style={styles.body}>{PLUS_COPY.includes}</Text>
            {renderPurchase()}
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        )}

        <View style={styles.legal}>
          {termsUrl ? (
            <Text style={styles.legalLink} onPress={() => WebBrowser.openBrowserAsync(termsUrl)} accessibilityRole="link">
              {PLUS_COPY.terms}
            </Text>
          ) : null}
          <Text style={styles.legalLink} onPress={() => WebBrowser.openBrowserAsync(PLUS_LINKS.privacy)} accessibilityRole="link">
            {PLUS_COPY.privacy}
          </Text>
        </View>
      </ScrollView>
    </CenteredContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  closeRow: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  section: {
    alignItems: 'center',
  },
  promise: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: 27,
    marginBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 17,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  doneIcon: {
    marginBottom: 12,
  },
  priceBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  buyButton: {
    width: '100%',
    maxWidth: 400,
    minHeight: 52,
    backgroundColor: '#FFA790',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderColor: '#FFA790',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  small: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  notice: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    backgroundColor: '#F6F6F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  restore: {
    marginTop: 18,
    paddingVertical: 6,
  },
  link: {
    fontSize: 16,
    color: '#1e90ff',
    textDecorationLine: 'underline',
  },
  message: {
    fontSize: 15,
    color: '#7A4A44',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 21,
  },
  legal: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 32,
  },
  legalLink: {
    fontSize: 14,
    color: '#888',
    textDecorationLine: 'underline',
  },
});
