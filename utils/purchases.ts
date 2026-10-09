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
import { PRICE_TEST_ID, isPlusProduct, type PlusProductId } from './priceTest';
import type { BuyResult, PlusTransaction, PurchasesSupport, RestoreResult, StoreProduct } from './purchasesTypes';

export type { BuyResult, PlusTransaction, PurchasesSupport, RestoreResult, StoreProduct } from './purchasesTypes';

export const PLUS_ENTITLEMENT = 'plus';

type Sdk = typeof import('react-native-purchases');

let sdk: Sdk | null = null;
let configured = false;
let identifying: Promise<void> = Promise.resolve();
const products = new Map<string, PurchasesStoreProduct>();

/** Loaded on first use, and only once purchasesSupport() has said the native module is there. */
function loadSdk(): Sdk {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (!sdk) sdk = require('react-native-purchases') as Sdk;
  return sdk;
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

/** The most recent store transaction for one of the Plus products. */
function latestPlusTransactionIn(info: CustomerInfo): PlusTransaction | null {
  const plus = (info.nonSubscriptionTransactions ?? [])
    .filter((transaction) => isPlusProduct(transaction.productIdentifier))
    .sort((a, b) => String(b.purchaseDate).localeCompare(String(a.purchaseDate)));
  return plus.length ? { productId: plus[0].productIdentifier, transactionId: plus[0].transactionIdentifier } : null;
}

/** Store calls that change who RevenueCat is talking about run one at a time, in order. */
function inTurn(task: () => Promise<void>): Promise<void> {
  const run = identifying.then(task);
  identifying = run.catch(() => undefined);
  return run;
}

/**
 * Is RevenueCat on this caregiver right now (null: an anonymous buyer)? Always asks the SDK:
 * a log-in that failed, or a log-out that switched users and then failed, leaves it on a user
 * nobody asked for, and a purchase made then would be filed under that user.
 */
async function isCurrentPurchaser(Purchases: Sdk['default'], appUserId: string | null): Promise<boolean> {
  return appUserId ? (await Purchases.getAppUserID()) === appUserId : Purchases.isAnonymous();
}

/**
 * Point RevenueCat at the caregiver who may buy: their emailHash, or null for an
 * anonymous buyer (a session without an email). Rejects when the store can't be reached.
 */
export function identifyPurchaser(appUserId: string | null): Promise<void> {
  return inTurn(async () => {
    if (purchasesSupport() !== 'ready') return;
    const { default: Purchases } = loadSdk();
    if (!configured) {
      Purchases.configure({ apiKey: apiKey(), appUserID: appUserId });
      configured = true;
      return;
    }
    if (await isCurrentPurchaser(Purchases, appUserId)) return;
    if (appUserId) await Purchases.logIn(appUserId);
    else await Purchases.logOut();
  });
}

/** After a logout, or for a member: stop pointing at anyone. Never starts the SDK. */
export function forgetPurchaser(): Promise<void> {
  return inTurn(async () => {
    if (!configured) return;
    const { default: Purchases } = loadSdk();
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  });
}

/** True only when RevenueCat is on exactly this caregiver, so a purchase or restore is filed under them. */
export async function purchaserIs(appUserId: string | null): Promise<boolean> {
  const sdk = await readySdk();
  if (!sdk) return false;
  try {
    return await isCurrentPurchaser(sdk.default, appUserId);
  } catch {
    return false;
  }
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

/** The latest Plus transaction of the current RevenueCat user, for recording a purchase approved later. */
export async function latestPlusTransaction(): Promise<PlusTransaction | null> {
  const sdk = await readySdk();
  if (!sdk) return null;
  try {
    return latestPlusTransactionIn(await sdk.default.getCustomerInfo());
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
export function onPlusChange(listener: (ownsPlus: boolean, transaction: PlusTransaction | null) => void): () => void {
  if (purchasesSupport() !== 'ready') return () => {};
  const handler = (info: CustomerInfo) => listener(ownsPlusIn(info), latestPlusTransactionIn(info));
  const { default: Purchases } = loadSdk();
  Purchases.addCustomerInfoUpdateListener(handler);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(handler);
  };
}
