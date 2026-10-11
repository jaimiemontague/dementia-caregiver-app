/**
 * Every word Help Now Plus puts on screen, in one place.
 *
 * App Review reads all of it. Plus is sold only through the store's in-app purchase, so
 * nothing here may mention, link to or hint at buying anywhere else: no web or site, no
 * "online", no addresses, no membership, nothing about other prices.
 * constants/__tests__/plusCopy.test.ts enforces the word list. PLUS_SETUP.md lists the
 * strings for approval.
 *
 * The promise is Krista's sentence (approved October 11, 2026). Placeholder: [PRICE] is
 * replaced on screen by the store's price for this user's product, never typed in.
 */
export const PLUS_COPY = {
  name: 'Help Now Plus',
  promise: 'Unlock 100 more videos and 35 printable cheat sheets',
  includes: 'Plus adds the extra situation videos and the printable cheat sheets.',

  // Paywall: buying
  buyButton: 'Get Plus for [PRICE]',
  oneTime: 'One-time purchase. No subscription.',
  chargedIos: 'Payment is charged to your Apple Account when you confirm the purchase.',
  chargedAndroid: 'Payment is charged to your Google Play account when you confirm the purchase.',
  restore: 'Restore purchases',
  terms: 'Terms of Use',
  privacy: 'Privacy Policy',
  close: 'Close',
  loadingPrice: 'Getting the price…',
  priceFailed: "The price didn't load. Check your connection and try again.",
  retry: 'Try again',

  // Paywall: where purchases can't happen
  preview: 'Preview only: purchases work in the installed app.',
  unavailable: "Purchases aren't available right now. Please try again later.",

  // Paywall: results
  owned: 'You have Help Now Plus',
  ownedDetail: 'The extra situation videos and the printable cheat sheets are unlocked.',
  purchased: 'Thank you! Plus is unlocked.',
  restored: 'Your purchase is restored. Plus is unlocked.',
  nothingToRestore: 'No Plus purchase was found to restore.',
  startWatching: 'Start watching',
  pending: 'Your purchase is waiting for approval. Plus unlocks as soon as it goes through.',
  notAllowed: 'Purchases are turned off on this device.',
  network: "We couldn't reach the store. Check your connection and try again.",
  failed: 'Something went wrong. Please try again.',

  // Where free users meet Plus
  badge: 'Plus',
  badgeLabel: 'Included with Plus',
  cheatsheetLabel: 'Printable cheat sheet for this situation',
  cheatsheetLocked: 'Included with Help Now Plus.',
  getPlus: 'Get Plus',
  lockedVideoTitle: 'This video is part of Help Now Plus',
  homeRowTitle: 'Help Now Plus',
  homeRowDetail: 'The extra situation videos and the printable cheat sheets',
  homeRowLabel: "Help Now Plus: see what's included",
} as const;

/**
 * Links on the paywall, the pages the store listings use. Not purchase links.
 * DSP has no terms page of its own: the App Store listing uses Apple's standard license
 * agreement, so iOS links to it and Android shows the privacy policy only. If a terms
 * page is published, set it here.
 */
export const PLUS_LINKS = {
  privacy: 'https://dementiasuccesspath.com/privacy-policy',
  termsIos: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  termsAndroid: null as string | null,
};

/** Put the store's price where [PRICE] stands. */
export function withPrice(text: string, price: string): string {
  return text.split('[PRICE]').join(price);
}
