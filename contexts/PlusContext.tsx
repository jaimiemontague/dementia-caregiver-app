import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { emailHash, normalizeEmail } from '@/utils/identity';
import {
  flushPlusEvents,
  isPlusProduct,
  priceTestUser,
  recordAssignment,
  recordPurchase,
  rememberPendingPurchase,
  settlePendingPurchase,
  type PlusProductId,
  type PriceTestUser,
} from '@/utils/priceTest';
import {
  buyProduct,
  forgetPurchaser,
  identifyPurchaser,
  latestPlusTransaction,
  loadProduct,
  onPlusChange,
  ownsPlus,
  purchasesSupport,
  restorePurchases,
  setPriceTestAttributes,
  type PurchasesSupport,
} from '@/utils/purchases';

/**
 * Help Now Plus on the phone: the price this caregiver is assigned (utils/priceTest.ts),
 * the store product, buying and restoring, and keeping the saved tier in step with the
 * store on app start, on every login, and whenever RevenueCat reports a change.
 * Members never touch the store: they have everything already.
 */

export type PlusOutcome =
  | 'purchased'
  | 'restored'
  | 'nothing-to-restore'
  | 'cancelled'
  | 'pending'
  | 'not-allowed'
  | 'network'
  | 'failed'
  | 'unavailable';

export type PriceStatus = 'idle' | 'loading' | 'loaded' | 'failed';

interface PlusContextType {
  support: PurchasesSupport;
  /** This caregiver's price-test product, once known. */
  product: PlusProductId | null;
  /** The store's localized price for it, once loaded. */
  price: string | null;
  priceStatus: PriceStatus;
  busy: boolean;
  /** Load the price for the paywall; the first price shown is recorded as the assignment. */
  loadPrice: () => Promise<void>;
  buy: () => Promise<PlusOutcome>;
  restore: () => Promise<PlusOutcome>;
}

const PlusContext = createContext<PlusContextType | undefined>(undefined);

export function PlusProvider({ children }: { children: React.ReactNode }) {
  const { authData, isAuthenticated, isMember, loading, setStorePlus } = useAuth();
  const email = isAuthenticated ? normalizeEmail(authData?.email) : null;
  const support = useMemo(() => purchasesSupport(), []);

  const [user, setUser] = useState<PriceTestUser | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [priceStatus, setPriceStatus] = useState<PriceStatus>('idle');
  const [busy, setBusy] = useState(false);

  // The session email now (null when logged out; empty for a session without one), and the
  // email RevenueCat was last pointed at. Store updates only apply when the two agree.
  const emailRef = useRef<string | null>(email);
  const identifiedRef = useRef<string | null>(null);
  const userRef = useRef<PriceTestUser | null>(null);

  useEffect(() => {
    emailRef.current = email;
  }, [email]);

  // On app start (once the saved session is read) and on every login or logout: assign the
  // price, point RevenueCat at this caregiver, and bring the tier in line with the store.
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      const testUser = email !== null ? await priceTestUser(email) : null;
      if (cancelled) return;
      userRef.current = testUser;
      setUser(testUser);
      setPrice(null);
      setPriceStatus('idle');
      if (support !== 'ready') return;

      identifiedRef.current = null;
      try {
        if (email === null || isMember || !testUser) {
          await forgetPurchaser();
          return;
        }
        await identifyPurchaser(email ? emailHash(email) : null);
        if (cancelled) return;
        identifiedRef.current = email;
        await setPriceTestAttributes(testUser.product);
        const owns = await ownsPlus();
        if (!cancelled && owns !== null) await setStorePlus(owns, email);
        if (!cancelled && owns) {
          // A purchase that was waiting for approval last time went through.
          const transaction = await latestPlusTransaction();
          await settlePendingPurchase(testUser, {
            product: transaction?.productId ?? null,
            platform: Platform.OS,
            transactionId: transaction?.transactionId ?? null,
          });
        }
      } catch {
        // The store is unreachable: keep the saved tier and try again next time.
      } finally {
        flushPlusEvents();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, isMember, loading, support, setStorePlus]);

  // Pending purchases that get approved later, refunds, purchases made from the store itself.
  useEffect(
    () =>
      onPlusChange((owns, transaction) => {
        const current = emailRef.current;
        const testUser = userRef.current;
        if (current === null || identifiedRef.current !== current) return;
        setStorePlus(owns, current);
        if (owns && testUser) {
          settlePendingPurchase(testUser, {
            product: transaction?.productId ?? null,
            platform: Platform.OS,
            transactionId: transaction?.transactionId ?? null,
          }).catch(() => undefined);
        }
      }),
    [setStorePlus],
  );

  const loadPrice = useCallback(async () => {
    const testUser = userRef.current;
    if (support !== 'ready' || !testUser) return;
    setPriceStatus('loading');
    const product = await loadProduct(testUser.product);
    if (userRef.current !== testUser) return; // another login in the meantime
    if (!product) {
      setPriceStatus('failed');
      return;
    }
    setPrice(product.priceString);
    setPriceStatus('loaded');
    recordAssignment(testUser).catch(() => undefined);
  }, [support]);

  const restoreFor = useCallback(
    async (forEmail: string | null): Promise<PlusOutcome> => {
      const result = await restorePurchases();
      if (result.status === 'restored') {
        if (forEmail !== null) await setStorePlus(true, forEmail);
        return 'restored';
      }
      return result.status === 'nothing' ? 'nothing-to-restore' : result.status;
    },
    [setStorePlus],
  );

  const buy = useCallback(async (): Promise<PlusOutcome> => {
    const testUser = userRef.current;
    const forEmail = emailRef.current;
    if (support !== 'ready' || !testUser) return 'unavailable';
    setBusy(true);
    try {
      const result = await buyProduct(testUser.product);
      if (result.status === 'purchased') {
        recordPurchase(testUser, {
          product: isPlusProduct(result.productId) ? result.productId : testUser.product,
          platform: Platform.OS,
          transactionId: result.transactionId,
        }).catch(() => undefined);
        if (!result.unlocked) return 'failed';
        if (forEmail !== null) await setStorePlus(true, forEmail);
        return 'purchased';
      }
      // The store says this account already owns Plus: restore it rather than send them hunting.
      if (result.status === 'already-owned') return await restoreFor(forEmail);
      // Recorded once the store approves it (on a later refresh or a store update).
      if (result.status === 'pending') await rememberPendingPurchase(testUser);
      return result.status;
    } finally {
      setBusy(false);
    }
  }, [support, setStorePlus, restoreFor]);

  const restore = useCallback(async (): Promise<PlusOutcome> => {
    if (support !== 'ready') return 'unavailable';
    setBusy(true);
    try {
      return await restoreFor(emailRef.current);
    } finally {
      setBusy(false);
    }
  }, [support, restoreFor]);

  return (
    <PlusContext.Provider
      value={{ support, product: user?.product ?? null, price, priceStatus, busy, loadPrice, buy, restore }}
    >
      {children}
    </PlusContext.Provider>
  );
}

export function usePlus() {
  const context = useContext(PlusContext);
  if (context === undefined) {
    throw new Error('usePlus must be used within a PlusProvider');
  }
  return context;
}
