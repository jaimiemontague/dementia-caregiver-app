/**
 * The store side of Help Now Plus, through RevenueCat (react-native-purchases).
 *
 * One entitlement, "plus", unlocked by any of the three non-consumable products in
 * utils/priceTest.ts. The RevenueCat user is the caregiver's emailHash, so a purchase
 * follows the login email to any phone. The public SDK keys come from app.config.js
 * (REVENUECAT_IOS_KEY / REVENUECAT_ANDROID_KEY at build time), never from the repo.
 *
 * Expo Go and older builds have no RNPurchases native module: purchasesSupport() says
 * "preview" and nothing here loads the SDK. The web uses utils/purchases.web.ts, which
 * keeps the SDK out of the web bundle.
 */
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import type { CustomerInfo, PurchasesStoreProduct } from 'react-native-purchases';
import { PRICE_TEST_ID, type PlusProductId } from './priceTest';
import type { BuyResult, PurchasesSupport, RestoreResult, StoreProduct } from './purchasesTypes';

export type { BuyResult, PurchasesSupport, RestoreResult, StoreProduct } from './purchasesTypes';

export const PLUS_ENTITLEMENT = 'plus';

type Sdk = typeof import('react-native-purchases');

let sdkPromise: Promise<Sdk> | null = null;
let configured = false;
let currentUser: string | null = null;
let identifying: Promise<void> = Promise.resolve();
const products = new Map<string, PurchasesStoreProduct>();

function loadSdk(): Promise<Sdk> {
  if (!sdkPromise) sdkPromise = import('react-native-purchases');
  return sdkPromise;
}

function apiKey(): string {
  const keys = (Constants.expoConfig?.extra?.revenueCat ?? {}) as { iosKey?: string; androidKey?: string };
  return (Platform.OS === 'ios' ? keys.iosKey : Platform.OS === 'android' ? keys.androidKey : '') || '';
}

export function purchasesSupport(): PurchasesSupport {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return 'preview';
  if (isRunningInExpoGo() || !NativeModules.RNPurchases) return 'preview';
  return apiKey() ? 'ready' : 'unavailable';
}

function ownsPlusIn(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PLUS_ENTITLEMENT]);
}

/** Store calls that change who RevenueCat is talking about run one at a time, in order. */
function inTurn(task: () => Promise<void>): Promise<void> {
  const run = identifying.then(task);
  identifying = run.catch(() => undefined);
  return run;
}

/**
 * Point RevenueCat at the caregiver who may buy: their emailHash, or null for an
 * anonymous buyer (a session without an email).
 */
export function identifyPurchaser(appUserId: string | null): Promise<void> {
  return inTurn(async () => {
    if (purchasesSupport() !== 'ready') return;
    const { default: Purchases } = await loadSdk();
    if (!configured) {
      Purchases.configure({ apiKey: apiKey(), appUserID: appUserId });
      configured = true;
      currentUser = appUserId;
      return;
    }
    if (appUserId === currentUser) return;
    if (appUserId) {
      await Purchases.logIn(appUserId);
    } else if (!(await Purchases.isAnonymous())) {
      await Purchases.logOut();
    }
    currentUser = appUserId;
  });
}

/** After a logout, or for a member: stop pointing at anyone. Never starts the SDK. */
export function forgetPurchaser(): Promise<void> {
  return inTurn(async () => {
    if (!configured || currentUser === null) return;
    const { default: Purchases } = await loadSdk();
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
    currentUser = null;
  });
}

/** Waits for the latest identifyPurchaser call; false when the store can't be used. */
async function readySdk(): Promise<Sdk | null> {
  await identifying;
  if (!configured || purchasesSupport() !== 'ready') return null;
  return loadSdk();
}

/** Does the current RevenueCat user own Plus? null when that can't be known right now. */
export async function ownsPlus(): Promise<boolean | null> {
  const sdk = await readySdk();
  if (!sdk) return null;
  try {
    return ownsPlusIn(await sdk.default.getCustomerInfo());
  } catch {
    return null;
  }
}

/** The store's product and localized price, or null when it can't be loaded. */
export async function loadProduct(id: PlusProductId): Promise<StoreProduct | null> {
  const sdk = await readySdk();
  if (!sdk) return null;
  try {
    const found = await sdk.default.getProducts([id], sdk.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    const product = found.find((item) => item.identifier === id);
    if (!product) return null;
    products.set(id, product);
    return { id, priceString: product.priceString };
  } catch {
    return null;
  }
}

export async function buyProduct(id: PlusProductId): Promise<BuyResult> {
  const sdk = await readySdk();
  if (!sdk) return { status: 'unavailable' };
  const product = products.get(id) ?? ((await loadProduct(id)) ? products.get(id) : undefined);
  if (!product) return { status: 'failed' };
  try {
    const result = await sdk.default.purchaseStoreProduct(product);
    return {
      status: 'purchased',
      productId: result.productIdentifier,
      transactionId: result.transaction?.transactionIdentifier ?? null,
      unlocked: ownsPlusIn(result.customerInfo),
    };
  } catch (error) {
    const codes = sdk.PURCHASES_ERROR_CODE;
    switch ((error as { code?: string } | null)?.code) {
      case codes.PURCHASE_CANCELLED_ERROR:
        return { status: 'cancelled' };
      case codes.PAYMENT_PENDING_ERROR:
        return { status: 'pending' };
      case codes.PURCHASE_NOT_ALLOWED_ERROR:
        return { status: 'not-allowed' };
      case codes.PRODUCT_ALREADY_PURCHASED_ERROR:
        return { status: 'already-owned' };
      case codes.NETWORK_ERROR:
      case codes.OFFLINE_CONNECTION_ERROR:
        return { status: 'network' };
      default:
        return { status: 'failed' };
    }
  }
}

export async function restorePurchases(): Promise<RestoreResult> {
  const sdk = await readySdk();
  if (!sdk) return { status: 'unavailable' };
  try {
    return { status: ownsPlusIn(await sdk.default.restorePurchases()) ? 'restored' : 'nothing' };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    const offline = code === sdk.PURCHASES_ERROR_CODE.NETWORK_ERROR || code === sdk.PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR;
    return { status: offline ? 'network' : 'failed' };
  }
}

/** The price-test product as RevenueCat subscriber attributes, so its dashboard can split by price. */
export async function setPriceTestAttributes(product: PlusProductId): Promise<void> {
  const sdk = await readySdk();
  if (!sdk) return;
  try {
    await sdk.default.setAttributes({ plus_price_test: PRICE_TEST_ID, plus_price_product: product });
  } catch {
    // Attributes are for reporting only.
  }
}

/** Calls back whenever RevenueCat reports new customer info (an approved pending purchase, a refund). */
export function onPlusChange(listener: (ownsPlus: boolean) => void): () => void {
  if (purchasesSupport() !== 'ready') return () => {};
  let active = true;
  const handler = (info: CustomerInfo) => {
    if (active) listener(ownsPlusIn(info));
  };
  loadSdk()
    .then((sdk) => {
      if (active) sdk.default.addCustomerInfoUpdateListener(handler);
    })
    .catch(() => undefined);
  return () => {
    active = false;
    loadSdk()
      .then((sdk) => sdk.default.removeCustomerInfoUpdateListener(handler))
      .catch(() => undefined);
  };
}
