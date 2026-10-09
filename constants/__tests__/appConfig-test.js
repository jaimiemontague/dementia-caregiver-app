/* global describe, it, expect, afterEach */
const appConfig = require('../../app.config');

const base = { config: { name: 'Help Now', extra: { eas: { projectId: 'test' } } } };
const originalEnvironment = { ...process.env };

describe('app.config.js', () => {
  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it('puts the RevenueCat keys from the environment into extra, and nowhere else', () => {
    process.env.REVENUECAT_IOS_KEY = 'appl_test';
    process.env.REVENUECAT_ANDROID_KEY = 'goog_test';
    delete process.env.EAS_BUILD_PROFILE;

    const config = appConfig(base);

    expect(config.extra).toEqual({ eas: { projectId: 'test' }, revenueCat: { iosKey: 'appl_test', androidKey: 'goog_test' } });
  });

  it('finds the copy placeholders still waiting, but not [PRICE], which the store fills', () => {
    const placeholders = appConfig.plusCopyPlaceholders();
    expect(placeholders).not.toContain('[PRICE]');
    for (const placeholder of placeholders) expect(placeholder).toMatch(/^\[[A-Z ]+\]$/);
  });

  it('stops a store build while a placeholder is left, and lets other builds through', () => {
    process.env.REVENUECAT_IOS_KEY = 'appl_test';
    process.env.REVENUECAT_ANDROID_KEY = 'goog_test';
    const waiting = appConfig.plusCopyPlaceholders();

    process.env.EAS_BUILD_PROFILE = 'development';
    expect(() => appConfig(base)).not.toThrow();

    process.env.EAS_BUILD_PROFILE = 'production';
    if (waiting.length) {
      expect(() => appConfig(base)).toThrow(/Replace .*\[PLUS PROMISE\]|Replace /);
    } else {
      expect(() => appConfig(base)).not.toThrow();
    }
  });
});
