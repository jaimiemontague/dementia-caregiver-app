/*
 * Expo reads app.json first and passes it in as `config`; this adds the values that come
 * from the environment, so no key is ever committed.
 *
 * REVENUECAT_IOS_KEY / REVENUECAT_ANDROID_KEY: RevenueCat's public SDK keys for Help Now
 * Plus. EAS builds read them from the EAS environment variables (see PLUS_SETUP.md);
 * `npx expo start` reads them from a local .env file, which git ignores. Without them the
 * Plus paywall says purchases aren't available.
 *
 * A production (store) build stops while constants/plusCopy.ts still holds a copy
 * placeholder such as [PLUS PROMISE]; [PRICE] is filled from the store on screen.
 */
const fs = require('fs');
const path = require('path');

function plusCopyPlaceholders() {
  const source = fs.readFileSync(path.join(__dirname, 'constants', 'plusCopy.ts'), 'utf8');
  const start = source.indexOf('PLUS_COPY = {');
  const end = source.indexOf('} as const', start);
  const strings = source.slice(start, end).match(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g) || [];
  const found = strings.flatMap((text) => text.match(/\[[A-Z][A-Z ]*\]/g) || []);
  return [...new Set(found)].filter((placeholder) => placeholder !== '[PRICE]');
}

module.exports = ({ config }) => {
  const revenueCat = {
    iosKey: process.env.REVENUECAT_IOS_KEY || '',
    androidKey: process.env.REVENUECAT_ANDROID_KEY || '',
  };
  if (process.env.EAS_BUILD_PROFILE && (!revenueCat.iosKey || !revenueCat.androidKey)) {
    console.warn('[Help Now Plus] REVENUECAT_IOS_KEY or REVENUECAT_ANDROID_KEY is not set for this build: the paywall will say purchases are not available.');
  }
  if (process.env.EAS_BUILD_PROFILE === 'production') {
    const placeholders = plusCopyPlaceholders();
    if (placeholders.length) {
      throw new Error(`[Help Now Plus] Replace ${placeholders.join(', ')} in constants/plusCopy.ts before a store build.`);
    }
  }
  return {
    ...config,
    extra: {
      ...config.extra,
      revenueCat,
    },
  };
};

module.exports.plusCopyPlaceholders = plusCopyPlaceholders;
