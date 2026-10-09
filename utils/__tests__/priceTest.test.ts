import { emailHash } from '../identity';
import {
  PLUS_EVENTS_URL,
  PLUS_PRODUCTS,
  PRICE_TEST_ID,
  assignProduct,
  flushPlusEvents,
  priceTestUser,
  recordAssignment,
  recordPurchase,
  rememberPendingPurchase,
  settlePendingPurchase,
} from '../priceTest';

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

const fetchMock = jest.fn();
const sentBodies = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
const queued = () => JSON.parse(mockStorage.get('plus_events_queue') ?? '[]');

beforeEach(() => {
  mockStorage.clear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

describe('assignment', () => {
  it('gives the same email the same product every time, whatever its case or spacing', async () => {
    const a = await priceTestUser('Caregiver@Example.com');
    const b = await priceTestUser('  caregiver@example.com ');
    expect(a).toEqual(b);
    expect(a.emailHash).toBe(emailHash('caregiver@example.com'));
    expect(a.product).toBe(assignProduct(a.emailHash as string));
    expect(PLUS_PRODUCTS).toContain(a.product);
  });

  it('splits caregivers roughly evenly across the five prices', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) {
      const product = assignProduct(emailHash(`caregiver${i}@example.com`));
      counts[product] = (counts[product] ?? 0) + 1;
    }
    expect(Object.keys(counts).sort()).toEqual([...PLUS_PRODUCTS].sort());
    for (const count of Object.values(counts)) {
      expect(count).toBeGreaterThan(520);
      expect(count).toBeLessThan(680);
    }
  });

  it('falls back to a random id kept on the phone when there is no email', async () => {
    const first = await priceTestUser('');
    const again = await priceTestUser(null);
    expect(first.emailHash).toBeNull();
    expect(first.deviceHash).toMatch(/^[0-9a-f]{12}$/);
    expect(again).toEqual(first);

    mockStorage.clear(); // a new install gets a new id
    expect((await priceTestUser(undefined)).deviceHash).not.toBe(first.deviceHash);
  });
});

describe('recording', () => {
  it('sends the assignment once per caregiver, with hashes only', async () => {
    const user = await priceTestUser('caregiver@example.com');

    await recordAssignment(user, new Date('2026-10-09T15:00:00Z'));
    await recordAssignment(user, new Date('2026-10-10T15:00:00Z'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(PLUS_EVENTS_URL);
    const [body] = sentBodies();
    expect(body).toEqual({
      type: 'assignment',
      test: PRICE_TEST_ID,
      emailHash: user.emailHash,
      deviceHash: null,
      product: user.product,
      assignedAt: '2026-10-09T15:00:00.000Z',
      eventId: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
    expect(JSON.stringify(body)).not.toContain('example.com');
    expect(queued()).toEqual([]);
  });

  it('sends every purchase with its platform and transaction', async () => {
    const user = await priceTestUser('caregiver@example.com');

    await recordPurchase(user, { product: 'help_now_plus_47', platform: 'android', transactionId: 'GPA.1-2-3' }, new Date('2026-10-09T16:00:00Z'));

    expect(sentBodies()[0]).toMatchObject({
      type: 'purchase',
      emailHash: user.emailHash,
      product: 'help_now_plus_47',
      platform: 'android',
      transactionId: 'GPA.1-2-3',
      purchasedAt: '2026-10-09T16:00:00.000Z',
    });
  });

  it('keeps an event that could not be sent and sends it next time', async () => {
    const user = await priceTestUser('caregiver@example.com');
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    await recordPurchase(user, { product: user.product, platform: 'ios', transactionId: '1000' });
    expect(queued()).toHaveLength(1);

    await flushPlusEvents();
    expect(queued()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentBodies()[1].transactionId).toBe('1000');
  });

  it('drops an event the function refuses for good, and keeps one it could not store yet', async () => {
    const user = await priceTestUser('caregiver@example.com');

    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    await recordPurchase(user, { product: user.product, platform: 'ios', transactionId: '2000' });
    expect(queued()).toHaveLength(1);

    // Not deployed yet: keep it.
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
    await flushPlusEvents();
    expect(queued()).toHaveLength(1);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });
    await flushPlusEvents();
    expect(queued()).toEqual([]);
  });

  it('records a purchase that was waiting for approval once the store approves it, once', async () => {
    const user = await priceTestUser('caregiver@example.com');
    const other = await priceTestUser('someone-else@example.com');
    await rememberPendingPurchase(user);

    // Another caregiver on the same phone does not settle it.
    await settlePendingPurchase(other, { product: null, platform: 'ios', transactionId: null });
    expect(fetchMock).not.toHaveBeenCalled();

    await rememberPendingPurchase(user);
    await settlePendingPurchase(user, { product: 'help_now_plus_47', platform: 'ios', transactionId: '30001' });
    await settlePendingPurchase(user, { product: 'help_now_plus_47', platform: 'ios', transactionId: '30001' });

    expect(sentBodies()).toEqual([expect.objectContaining({ type: 'purchase', emailHash: user.emailHash, product: 'help_now_plus_47', transactionId: '30001' })]);
  });
});
