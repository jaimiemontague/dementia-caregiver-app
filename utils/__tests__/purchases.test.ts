/**
 * utils/purchases.ts against the real react-native-purchases JavaScript, with a fake native
 * module standing in for StoreKit and Play Billing: checks what the wrapper asks the store
 * for and how it reads the answers.
 */
type Purchases = typeof import('../purchases');

jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { revenueCat: { iosKey: 'appl_test', androidKey: 'goog_test' } } } },
}));
// The SDK's web mode is never used here, and its package is ESM-only.
jest.mock('@revenuecat/purchases-js-hybrid-mappings', () => ({ PurchasesCommon: {} }));
jest.mock('@/hooks/useWebStorage', () => ({
  Storage: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
}));

const info = (ownsPlus: boolean) => ({
  entitlements: { active: ownsPlus ? { plus: { identifier: 'plus', isActive: true } } : {}, all: {}, verification: 'NOT_REQUESTED' },
  activeSubscriptions: [],
  allPurchasedProductIdentifiers: [],
  nonSubscriptionTransactions: [] as { transactionIdentifier: string; productIdentifier: string; purchaseDate: string }[],
});

const storeError = (code: string) => Object.assign(new Error(`store error ${code}`), { code, userInfo: { readableErrorCode: 'TEST' } });

const setupPurchases = jest.fn();
const native = {
  setupPurchases,
  isConfigured: jest.fn(async () => setupPurchases.mock.calls.length > 0),
  logIn: jest.fn(async (_id: string) => ({ customerInfo: info(false), created: false })),
  logOut: jest.fn(async () => info(false)),
  isAnonymous: jest.fn(async () => false),
  getCustomerInfo: jest.fn(async () => info(false)),
  getProductInfo: jest.fn(async (ids: string[], _type: string) =>
    ids.map((id) => ({ identifier: id, priceString: '$37.00', price: 37, currencyCode: 'USD', title: 'Help Now Plus', description: '', productCategory: 'NON_SUBSCRIPTION' })),
  ),
  // The native signature: (productId, productChangeInfo, productCategory, discountTimestamp, googleInfo, offeringContext)
  purchaseProduct: jest.fn(async (id: string, _change?: unknown, _category?: string) => ({
    productIdentifier: id,
    customerInfo: info(true),
    transaction: { transactionIdentifier: '2000000123', productIdentifier: id, purchaseDate: '2026-10-09T16:00:00Z' },
  })),
  restorePurchases: jest.fn(async () => info(true)),
  setAttributes: jest.fn(),
  setLogHandler: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

/** A fresh copy of the wrapper and the SDK, with the fake native module in place first. */
function load(): Purchases {
  jest.resetModules();
  // Fresh modules have to be required after the reset, not imported.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native').NativeModules.RNPurchases = native;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../purchases');
}

beforeEach(() => {
  jest.clearAllMocks();
});

it('is ready with the native module and a key', () => {
  expect(load().purchasesSupport()).toBe('ready');
});

it('configures once with the emailHash, then logs in, out and back in as the caregiver changes', async () => {
  const purchases = load();

  await purchases.identifyPurchaser('0123456789ab');
  expect(native.setupPurchases).toHaveBeenCalledTimes(1);
  expect(native.setupPurchases.mock.calls[0].slice(0, 2)).toEqual(['appl_test', '0123456789ab']);

  await purchases.identifyPurchaser('0123456789ab');
  expect(native.logIn).not.toHaveBeenCalled();

  await purchases.forgetPurchaser();
  expect(native.logOut).toHaveBeenCalledTimes(1);

  await purchases.identifyPurchaser('ba9876543210');
  expect(native.logIn).toHaveBeenCalledWith('ba9876543210');
  expect(native.setupPurchases).toHaveBeenCalledTimes(1);
});

it('never starts the SDK just to forget someone (members, logged-out phones)', async () => {
  const purchases = load();
  await purchases.forgetPurchaser();
  expect(native.setupPurchases).not.toHaveBeenCalled();
  expect(await purchases.ownsPlus()).toBeNull();
});

it('reads the plus entitlement, loads the product as a one-time product, and sets the price-test attributes', async () => {
  const purchases = load();
  await purchases.identifyPurchaser('0123456789ab');

  expect(await purchases.ownsPlus()).toBe(false);
  native.getCustomerInfo.mockResolvedValueOnce(info(true));
  expect(await purchases.ownsPlus()).toBe(true);

  expect(await purchases.loadProduct('help_now_plus_37')).toEqual({ id: 'help_now_plus_37', priceString: '$37.00' });
  expect(native.getProductInfo).toHaveBeenCalledWith(['help_now_plus_37'], 'NON_SUBSCRIPTION');

  await purchases.setPriceTestAttributes('help_now_plus_37');
  expect(native.setAttributes).toHaveBeenCalledWith({ plus_price_test: 'plus-price-2026-10', plus_price_product: 'help_now_plus_37' });
});

it('buys the store product and reports whether Plus unlocked', async () => {
  const purchases = load();
  await purchases.identifyPurchaser('0123456789ab');

  expect(await purchases.buyProduct('help_now_plus_37')).toEqual({ status: 'purchased', productId: 'help_now_plus_37', transactionId: '2000000123', unlocked: true });
  expect(native.purchaseProduct.mock.calls[0][0]).toBe('help_now_plus_37');
  expect(native.purchaseProduct.mock.calls[0][2]).toBe('NON_SUBSCRIPTION');

  // A product the RevenueCat dashboard forgot to attach to "plus": paid, but nothing unlocked.
  native.purchaseProduct.mockResolvedValueOnce({ productIdentifier: 'help_now_plus_37', customerInfo: info(false), transaction: { transactionIdentifier: '2000000124', productIdentifier: 'help_now_plus_37', purchaseDate: '' } });
  expect(await purchases.buyProduct('help_now_plus_37')).toMatchObject({ status: 'purchased', unlocked: false });
});

it('turns the store errors into outcomes the paywall can explain', async () => {
  const purchases = load();
  await purchases.identifyPurchaser('0123456789ab');

  const cases: [string, string][] = [['1', 'cancelled'], ['20', 'pending'], ['3', 'not-allowed'], ['6', 'already-owned'], ['10', 'network'], ['35', 'network'], ['2', 'failed']];
  for (const [code, status] of cases) {
    native.purchaseProduct.mockRejectedValueOnce(storeError(code));
    expect(await purchases.buyProduct('help_now_plus_27')).toEqual({ status });
  }
});

it('finds the latest Plus transaction, for a purchase approved later', async () => {
  const purchases = load();
  await purchases.identifyPurchaser('0123456789ab');

  native.getCustomerInfo.mockResolvedValueOnce({
    ...info(true),
    nonSubscriptionTransactions: [
      { transactionIdentifier: '1', productIdentifier: 'help_now_plus_27', purchaseDate: '2026-10-01T00:00:00Z' },
      { transactionIdentifier: '2', productIdentifier: 'some_other_product', purchaseDate: '2026-10-09T00:00:00Z' },
      { transactionIdentifier: '3', productIdentifier: 'help_now_plus_37', purchaseDate: '2026-10-05T00:00:00Z' },
    ],
  });
  expect(await purchases.latestPlusTransaction()).toEqual({ productId: 'help_now_plus_37', transactionId: '3' });
});

it('restores', async () => {
  const purchases = load();
  await purchases.identifyPurchaser('0123456789ab');

  expect(await purchases.restorePurchases()).toEqual({ status: 'restored' });
  native.restorePurchases.mockResolvedValueOnce(info(false));
  expect(await purchases.restorePurchases()).toEqual({ status: 'nothing' });
  native.restorePurchases.mockRejectedValueOnce(storeError('10'));
  expect(await purchases.restorePurchases()).toEqual({ status: 'network' });
});
