/**
 * The web app has no store, so Plus can't be bought here: the paywall shows its preview
 * state. Same API as utils/purchases.ts, without loading the RevenueCat SDK at all.
 */
import type { PlusProductId } from './priceTest';
import type { BuyResult, PlusTransaction, PurchasesSupport, RestoreResult, StoreProduct } from './purchasesTypes';

export type { BuyResult, PlusTransaction, PurchasesSupport, RestoreResult, StoreProduct } from './purchasesTypes';

export const PLUS_ENTITLEMENT = 'plus';

export function purchasesSupport(): PurchasesSupport {
  return 'preview';
}

export async function identifyPurchaser(_appUserId: string | null): Promise<void> {}

export async function forgetPurchaser(): Promise<void> {}

export async function ownsPlus(): Promise<boolean | null> {
  return null;
}

export async function latestPlusTransaction(): Promise<PlusTransaction | null> {
  return null;
}

export async function loadProduct(_id: PlusProductId): Promise<StoreProduct | null> {
  return null;
}

export async function buyProduct(_id: PlusProductId): Promise<BuyResult> {
  return { status: 'unavailable' };
}

export async function restorePurchases(): Promise<RestoreResult> {
  return { status: 'unavailable' };
}

export async function setPriceTestAttributes(_product: PlusProductId): Promise<void> {}

export function onPlusChange(_listener: (ownsPlus: boolean, transaction: PlusTransaction | null) => void): () => void {
  return () => {};
}
