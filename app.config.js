/*
 * Expo reads app.json first and passes it in as `config`; this adds the values that come
 * from the environment, so no key is ever committed.
 *
 * REVENUECAT_IOS_KEY / REVENUECAT_ANDROID_KEY: RevenueCat's public SDK keys for Help Now
 * Plus. EAS builds read them from the EAS environment variables (see PLUS_SETUP.md);
 * `npx expo start` reads them from a local .env file, which git ignores. Without them the
 * Plus paywall says purchases aren't available.
 */
module.exports = ({ config }) => {
  const revenueCat = {
    iosKey: process.env.REVENUECAT_IOS_KEY || '',
    androidKey: process.env.REVENUECAT_ANDROID_KEY || '',
  };
  if (process.env.EAS_BUILD_PROFILE && (!revenueCat.iosKey || !revenueCat.androidKey)) {
    console.warn('[Help Now Plus] REVENUECAT_IOS_KEY or REVENUECAT_ANDROID_KEY is not set for this build: the paywall will say purchases are not available.');
  }
  return {
    ...config,
    extra: {
      ...config.extra,
      revenueCat,
    },
  };
};
