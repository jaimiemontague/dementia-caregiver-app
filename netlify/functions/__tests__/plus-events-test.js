const mockBlobStore = {
  setJSON: jest.fn(),
};
jest.mock('@netlify/blobs', () => ({
  connectLambda: jest.fn(),
  getStore: jest.fn(() => mockBlobStore),
}), { virtual: true });

const blobs = require('@netlify/blobs');
const { handler } = require('../plus-events');

const TEST = 'plus-price-2026-10';
const HASH = '0123456789ab';

function post(body) {
  return handler({ httpMethod: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
}

function assignment(overrides = {}) {
  return { type: 'assignment', test: TEST, emailHash: HASH, deviceHash: null, product: 'help_now_plus_37', assignedAt: '2026-10-09T15:00:00.000Z', eventId: 'abcdef0123456789', ...overrides };
}

function purchase(overrides = {}) {
  return { type: 'purchase', test: TEST, emailHash: HASH, deviceHash: null, product: 'help_now_plus_37', purchasedAt: '2026-10-09T15:05:00.000Z', platform: 'ios', transactionId: '2000000123456789', eventId: 'fedcba9876543210', ...overrides };
}

describe('plus-events Netlify function', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBlobStore.setJSON.mockResolvedValue({ modified: true, etag: '"1"' });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('stores the first assignment per caregiver and test, and never overwrites it', async () => {
    const response = await post(assignment());

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true, stored: true });
    expect(blobs.getStore).toHaveBeenCalledWith('app-plus');
    expect(mockBlobStore.setJSON).toHaveBeenCalledWith(
      `assignments/${TEST}/e-${HASH}`,
      { test: TEST, emailHash: HASH, deviceHash: null, product: 'help_now_plus_37', assignedAt: '2026-10-09T15:00:00.000Z', receivedAt: expect.any(String) },
      { onlyIfNew: true },
    );

    mockBlobStore.setJSON.mockResolvedValue({ modified: false });
    expect(JSON.parse((await post(assignment())).body)).toEqual({ ok: true, stored: false });
  });

  it('stores one purchase per store transaction, with the platform', async () => {
    await post(purchase({ platform: 'android', transactionId: 'GPA.3312-5550-1234-56789' }));

    expect(mockBlobStore.setJSON).toHaveBeenCalledWith(
      `purchases/${TEST}/e-${HASH}/t-GPA.3312-5550-1234-56789`,
      expect.objectContaining({ product: 'help_now_plus_37', platform: 'android', purchasedAt: '2026-10-09T15:05:00.000Z', transactionId: 'GPA.3312-5550-1234-56789' }),
      { onlyIfNew: true },
    );
  });

  it('falls back to the event id without a transaction id, and to the arrival time for a bad clock', async () => {
    await post(purchase({ transactionId: null, purchasedAt: '2099-01-01T00:00:00.000Z', platform: 'web' }));

    const [key, record] = mockBlobStore.setJSON.mock.calls[0];
    expect(key).toBe(`purchases/${TEST}/e-${HASH}/e-fedcba9876543210`);
    expect(record.purchasedAt).toBe(record.receivedAt);
    expect(record.platform).toBe('unknown');
  });

  it('keys a session without an email by its device hash', async () => {
    await post(assignment({ emailHash: null, deviceHash: 'ba9876543210' }));

    const [key, record] = mockBlobStore.setJSON.mock.calls[0];
    expect(key).toBe(`assignments/${TEST}/d-ba9876543210`);
    expect(record).toMatchObject({ emailHash: null, deviceHash: 'ba9876543210' });
  });

  it('keeps nothing it was not asked to keep', async () => {
    await post(purchase({ email: 'someone@example.com', name: 'Someone' }));

    const [, record] = mockBlobStore.setJSON.mock.calls[0];
    expect(JSON.stringify(record)).not.toContain('someone');
    expect(Object.keys(record).sort()).toEqual(['deviceHash', 'emailHash', 'platform', 'product', 'purchasedAt', 'receivedAt', 'test', 'transactionId']);
  });

  it('rejects anything that is not a valid event', async () => {
    const bad = [
      assignment({ type: 'refund' }),
      assignment({ product: 'help_now_plus_99' }),
      assignment({ emailHash: 'someone@example.com' }),
      assignment({ emailHash: null }),
      assignment({ test: '../logins' }),
      [assignment()],
    ];
    for (const body of bad) {
      expect((await post(body)).statusCode).toBe(400);
    }
    expect((await post('not json')).statusCode).toBe(400);
    expect((await post({ ...assignment(), padding: 'x'.repeat(3000) })).statusCode).toBe(413);
    expect((await handler({ httpMethod: 'GET' })).statusCode).toBe(405);
    expect((await handler({ httpMethod: 'OPTIONS' })).statusCode).toBe(200);
    expect(mockBlobStore.setJSON).not.toHaveBeenCalled();
  });

  it('answers 503 when the store fails, so the app keeps the event and retries', async () => {
    mockBlobStore.setJSON.mockRejectedValue(new Error('blobs unavailable'));

    const response = await post(assignment());

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('blobs unavailable');
  });
});
