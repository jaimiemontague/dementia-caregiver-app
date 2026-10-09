import type { PlusProductId } from './priceTest';

/**
 * ready        the store can sell Plus here
 * preview      no store in this runtime: Expo Go, the web, or a build made before the
 *              purchases module was added
 * unavailable  an installed build without its RevenueCat key (a build setup problem)
 */
export type PurchasesSupport = 'ready' | 'preview' | 'unavailable';

/** A Plus product as the store prices it for this caregiver (priceString is localized). */
export type StoreProduct = { id: PlusProductId; priceString: string };

export type BuyResult =
  | { status: 'purchased'; productId: string; transactionId: string | null; unlocked: boolean }
  | { status: 'cancelled' | 'pending' | 'not-allowed' | 'already-owned' | 'network' | 'failed' | 'unavailable' };

/** A store transaction for one of the Plus products. */
export type PlusTransaction = { productId: string; transactionId: string };

export type RestoreResult = { status: 'restored' | 'nothing' | 'network' | 'failed' | 'unavailable' };
