import * as React from 'react';
import renderer, { act } from 'react-test-renderer';
import { PlusProvider, usePlus, type PlusOutcome } from '../PlusContext';
import { emailHash } from '@/utils/identity';
import { assignProduct } from '@/utils/priceTest';

const mockStorage = new Map<string, string>();
jest.mock('@/hooks/useWebStorage', () => ({
  Storage: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
  },
}));

const mockAuth = {
  authData: { email: 'Caregiver@Example.com', leadId: '', authenticated: true, timestamp: 0, tier: 'free' } as Record<string, unknown> | null,
  isAuthenticated: true,
  isMember: false,
  loading: false,
  setStorePlus: jest.fn(async () => undefined),
};
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));

const mockStore = {
  support: 'ready',
  identifyPurchaser: jest.fn(async (_appUserId: string | null) => undefined),
  forgetPurchaser: jest.fn(async () => undefined),
  setPriceTestAttributes: jest.fn(async (_product: string) => undefined),
  ownsPlus: jest.fn(async (): Promise<boolean | null> => false),
  latestPlusTransaction: jest.fn(async (): Promise<{ productId: string; transactionId: string } | null> => null),
  loadProduct: jest.fn(async (id: string) => ({ id, priceString: '$37.00' })),
  buyProduct: jest.fn(),
  restorePurchases: jest.fn(),
};
// The factory runs before this file's constants exist, so it hands out delegates.
jest.mock('@/utils/purchases', () => ({
  purchasesSupport: () => mockStore.support,
  identifyPurchaser: (id: string | null) => mockStore.identifyPurchaser(id),
  forgetPurchaser: () => mockStore.forgetPurchaser(),
  setPriceTestAttributes: (product: string) => mockStore.setPriceTestAttributes(product),
  ownsPlus: () => mockStore.ownsPlus(),
  latestPlusTransaction: () => mockStore.latestPlusTransaction(),
  loadProduct: (id: string) => mockStore.loadProduct(id),
  buyProduct: (id: string) => mockStore.buyProduct(id),
  restorePurchases: () => mockStore.restorePurchases(),
  onPlusChange: () => () => {},
}));

const EMAIL = 'caregiver@example.com';
const PRODUCT = assignProduct(emailHash(EMAIL));
const fetchMock = jest.fn();
let plus: ReturnType<typeof usePlus>;

// Hands the context value out after each render.
function Probe({ onValue }: { onValue: (value: ReturnType<typeof usePlus>) => void }) {
  const value = usePlus();
  React.useEffect(() => {
    onValue(value);
  });
  return null;
}

async function settle() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function mount() {
  await act(async () => {
    renderer.create(
      <PlusProvider>
        <Probe onValue={(value) => { plus = value; }} />
      </PlusProvider>,
    );
  });
  await settle();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  mockStore.support = 'ready';
  mockAuth.authData = { email: 'Caregiver@Example.com', leadId: '', authenticated: true, timestamp: 0, tier: 'free' };
  mockAuth.isAuthenticated = true;
  mockAuth.isMember = false;
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

describe('PlusProvider', () => {
  it('points the store at the emailHash on start and unlocks Plus the store already has', async () => {
    mockStore.ownsPlus.mockResolvedValueOnce(true);

    await mount();

    expect(mockStore.identifyPurchaser).toHaveBeenCalledWith(emailHash(EMAIL));
    expect(mockStore.setPriceTestAttributes).toHaveBeenCalledWith(PRODUCT);
    expect(mockAuth.setStorePlus).toHaveBeenCalledWith(true, EMAIL);
    expect(plus.product).toBe(PRODUCT);
  });

  it('leaves members out of the store entirely', async () => {
    mockAuth.isMember = true;
    mockAuth.authData = { ...mockAuth.authData, tier: 'member' };

    await mount();

    expect(mockStore.forgetPurchaser).toHaveBeenCalled();
    expect(mockStore.identifyPurchaser).not.toHaveBeenCalled();
    expect(mockAuth.setStorePlus).not.toHaveBeenCalled();
  });

  it('loads the assigned price and records that it was shown', async () => {
    await mount();

    await act(async () => {
      await plus.loadPrice();
    });
    await settle();

    expect(mockStore.loadProduct).toHaveBeenCalledWith(PRODUCT);
    expect(plus.price).toBe('$37.00');
    expect(plus.priceStatus).toBe('loaded');
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies).toEqual([expect.objectContaining({ type: 'assignment', emailHash: emailHash(EMAIL), product: PRODUCT })]);
  });

  it('unlocks Plus and records the purchase after a store purchase', async () => {
    mockStore.buyProduct.mockResolvedValueOnce({ status: 'purchased', productId: PRODUCT, transactionId: 'tx-1', unlocked: true });
    await mount();

    let outcome: PlusOutcome | undefined;
    await act(async () => {
      outcome = await plus.buy();
    });
    await settle();

    expect(outcome).toBe('purchased');
    expect(mockStore.buyProduct).toHaveBeenCalledWith(PRODUCT);
    expect(mockAuth.setStorePlus).toHaveBeenLastCalledWith(true, EMAIL);
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies).toContainEqual(expect.objectContaining({ type: 'purchase', product: PRODUCT, transactionId: 'tx-1', platform: 'ios' }));
  });

  it('restores instead when the store says this account already owns Plus', async () => {
    mockStore.buyProduct.mockResolvedValueOnce({ status: 'already-owned' });
    mockStore.restorePurchases.mockResolvedValueOnce({ status: 'restored' });
    await mount();

    let outcome: PlusOutcome | undefined;
    await act(async () => {
      outcome = await plus.buy();
    });

    expect(outcome).toBe('restored');
    expect(mockAuth.setStorePlus).toHaveBeenLastCalledWith(true, EMAIL);
  });

  it('records a purchase that was waiting for approval when a later start finds it approved', async () => {
    mockStore.buyProduct.mockResolvedValueOnce({ status: 'pending' });
    await mount();

    let outcome: PlusOutcome | undefined;
    await act(async () => {
      outcome = await plus.buy();
    });
    expect(outcome).toBe('pending');
    expect(fetchMock).not.toHaveBeenCalled();

    // Next app start: the store now says Plus is owned.
    mockStore.ownsPlus.mockResolvedValueOnce(true);
    mockStore.latestPlusTransaction.mockResolvedValueOnce({ productId: PRODUCT, transactionId: 'tx-9' });
    await mount();

    expect(mockAuth.setStorePlus).toHaveBeenLastCalledWith(true, EMAIL);
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies).toEqual([expect.objectContaining({ type: 'purchase', product: PRODUCT, transactionId: 'tx-9' })]);
  });

  it('reports a cancelled purchase and an empty restore without unlocking anything', async () => {
    mockStore.buyProduct.mockResolvedValueOnce({ status: 'cancelled' });
    mockStore.restorePurchases.mockResolvedValueOnce({ status: 'nothing' });
    await mount();
    mockAuth.setStorePlus.mockClear();

    let bought: PlusOutcome | undefined;
    let restored: PlusOutcome | undefined;
    await act(async () => {
      bought = await plus.buy();
      restored = await plus.restore();
    });

    expect(bought).toBe('cancelled');
    expect(restored).toBe('nothing-to-restore');
    expect(mockAuth.setStorePlus).not.toHaveBeenCalled();
  });

  it('never calls the store in preview (Expo Go, the web)', async () => {
    mockStore.support = 'preview';
    await mount();

    let outcome: PlusOutcome | undefined;
    await act(async () => {
      await plus.loadPrice();
      outcome = await plus.buy();
    });

    expect(outcome).toBe('unavailable');
    expect(plus.support).toBe('preview');
    expect(mockStore.identifyPurchaser).not.toHaveBeenCalled();
    expect(mockStore.loadProduct).not.toHaveBeenCalled();
    expect(mockStore.buyProduct).not.toHaveBeenCalled();
  });
});
