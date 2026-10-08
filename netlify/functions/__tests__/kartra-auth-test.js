jest.mock('axios', () => ({
  post: jest.fn(),
  request: jest.fn(),
}));

const mockBlobStore = {
  get: jest.fn(),
  setJSON: jest.fn(),
};
jest.mock('@netlify/blobs', () => ({
  connectLambda: jest.fn(),
  getStore: jest.fn(() => mockBlobStore),
}), { virtual: true });

const axios = require('axios');
const { handler } = require('../kartra-auth');

const originalEnvironment = process.env;

function kartraLead(memberships) {
  return {
    data: {
      status: 'Success',
      lead_details: { id: 'lead-123', email: 'member@example.com', memberships },
    },
  };
}

function kartraNotFound() {
  return { data: { status: 'Error', message: 'Lead not found' } };
}

function mailchimpContact(overrides = {}) {
  return {
    status: 200,
    data: {
      id: 'mc-abc',
      email_address: 'lead@example.com',
      status: 'unsubscribed',
      merge_fields: { APPFIRST: '', APPLAST: '', ...overrides },
    },
  };
}

function post(email, extra = {}) {
  return handler({ httpMethod: 'POST', body: JSON.stringify({ email, ...extra }) });
}

describe('kartra-auth Netlify function', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBlobStore.get.mockResolvedValue(null);
    mockBlobStore.setJSON.mockResolvedValue(undefined);
    axios.request.mockResolvedValue({ status: 200, data: {} });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    process.env = {
      ...originalEnvironment,
      KARTRA_API_KEY: 'test-api-key',
      KARTRA_API_PASSWORD: 'test-api-password',
      KARTRA_APP_ID: 'test-app-id',
      MAILCHIMP_API_KEY: 'test-mailchimp-key-us10',
      MAILCHIMP_LIST_ID: '6bea51ee85',
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('grants the member tier on an active Kartra membership and preserves the Kartra request shape', async () => {
    axios.post.mockResolvedValue(kartraLead([{ id: 'active', active: '1' }, { id: 'inactive', active: '0' }]));

    const response = await post('Member@Example.com', { platform: 'ios' });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      isVerified: true,
      hasActiveSubscription: true,
      tier: 'member',
      leadId: 'lead-123',
      email: 'member@example.com',
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, formData, config] = axios.post.mock.calls[0];
    expect(url).toBe('https://app.kartra.com/api');
    expect(formData).toBeInstanceOf(URLSearchParams);
    expect(formData.get('get_lead[email]')).toBe('member@example.com');
    expect(formData.get('api_key')).toBe('test-api-key');
    expect(config).toMatchObject({
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0,
      maxBodyLength: 16 * 1024,
      maxContentLength: 1024 * 1024,
      timeout: 10000,
    });

    // members are never looked up or written in Mailchimp
    expect(axios.request).not.toHaveBeenCalled();
    // every login is written to the Netlify Blobs log
    expect(mockBlobStore.setJSON).toHaveBeenCalledWith(expect.stringMatching(/^users\/[0-9a-f]{12}$/), expect.objectContaining({ tier: 'member', logins: 1, platforms: ['ios'] }));
  });

  it('grants the free tier to a Kartra lead without an active membership', async () => {
    axios.post.mockResolvedValue(kartraLead([{ id: 'old', active: '0' }]));
    axios.request.mockResolvedValueOnce({ status: 404, data: { title: 'Resource Not Found' } });

    const body = JSON.parse((await post('lead@example.com')).body);

    expect(body).toMatchObject({ isVerified: true, hasActiveSubscription: true, tier: 'free', leadId: 'lead-123' });
    // not in Mailchimp, so nothing to record there
    expect(axios.request).toHaveBeenCalledTimes(1);
    expect(axios.request.mock.calls[0][0].method).toBe('GET');
  });

  it('grants the free tier to an unsubscribed Mailchimp contact unknown to Kartra, and records the first login', async () => {
    axios.post.mockResolvedValue(kartraNotFound());
    axios.request
      .mockResolvedValueOnce(mailchimpContact())            // GET lookup
      .mockResolvedValueOnce({ status: 200, data: {} })     // PATCH login dates
      .mockResolvedValueOnce({ status: 204, data: '' });    // POST tags

    const body = JSON.parse((await post('lead@example.com', { platform: 'web' })).body);

    expect(body).toMatchObject({ isVerified: true, hasActiveSubscription: true, tier: 'free', leadId: 'mc-abc', email: 'lead@example.com' });

    const calls = axios.request.mock.calls.map(([config]) => config);
    expect(calls[0]).toMatchObject({ method: 'GET', auth: { password: 'test-mailchimp-key-us10' } });
    expect(calls[0].url).toMatch(/^https:\/\/us10\.api\.mailchimp\.com\/3\.0\/lists\/6bea51ee85\/members\/[0-9a-f]{32}\?fields=/);
    expect(calls[1]).toMatchObject({ method: 'PATCH' });
    expect(calls[1].data.merge_fields).toEqual({ APPFIRST: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), APPLAST: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(calls[2]).toMatchObject({ method: 'POST', data: { tags: [{ name: 'app user', status: 'active' }] } });
    expect(calls[2].url).toMatch(/\/tags$/);
  });

  it('adds the returned tag when the first login was a week or more ago', async () => {
    axios.post.mockResolvedValue(kartraNotFound());
    axios.request
      .mockResolvedValueOnce(mailchimpContact({ APPFIRST: '2026-01-01', APPLAST: '2026-01-01' }))
      .mockResolvedValueOnce({ status: 200, data: {} })
      .mockResolvedValueOnce({ status: 204, data: '' });

    await post('lead@example.com');

    const [, patch, tags] = axios.request.mock.calls.map(([config]) => config);
    expect(patch.data.merge_fields).toEqual({ APPLAST: expect.any(String) });
    expect(tags.data.tags.map((t) => t.name)).toEqual(['app user', 'app returned']);
  });

  it('refuses an email found nowhere', async () => {
    axios.post.mockResolvedValue(kartraNotFound());
    axios.request.mockResolvedValueOnce({ status: 404, data: {} });

    const body = JSON.parse((await post('nobody@example.com')).body);

    expect(body).toEqual({ isVerified: false, hasActiveSubscription: false, tier: null, message: 'Email not found in system' });
    expect(mockBlobStore.setJSON).not.toHaveBeenCalled();
  });

  it('still admits a Mailchimp contact when Kartra is down, and reports a failure when both are unknown', async () => {
    axios.post.mockRejectedValue({ message: 'Request failed', response: { data: { internal: 'sensitive upstream response' } } });
    axios.request
      .mockResolvedValueOnce(mailchimpContact())
      .mockResolvedValueOnce({ status: 200, data: {} })
      .mockResolvedValueOnce({ status: 204, data: '' });

    const admitted = JSON.parse((await post('lead@example.com')).body);
    expect(admitted).toMatchObject({ isVerified: true, tier: 'free' });

    axios.request.mockReset();
    axios.request.mockResolvedValueOnce({ status: 404, data: {} });
    const response = await post('lead@example.com');
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ isVerified: false, hasActiveSubscription: false, tier: null, error: 'Verification failed' });
    expect(response.body).not.toContain('sensitive upstream response');
  });

  it('never fails a login because the login records fail', async () => {
    axios.post.mockResolvedValue(kartraNotFound());
    axios.request
      .mockResolvedValueOnce(mailchimpContact())
      .mockRejectedValueOnce(new Error('PATCH exploded'));
    mockBlobStore.setJSON.mockRejectedValue(new Error('blobs unavailable'));

    const body = JSON.parse((await post('lead@example.com')).body);

    expect(body).toMatchObject({ isVerified: true, tier: 'free' });
  });

  it('works without a Mailchimp key: Kartra leads and members only', async () => {
    delete process.env.MAILCHIMP_API_KEY;
    axios.post.mockResolvedValue(kartraNotFound());

    const body = JSON.parse((await post('lead@example.com')).body);

    expect(body).toMatchObject({ isVerified: false, message: 'Email not found in system' });
    expect(axios.request).not.toHaveBeenCalled();
  });

  it('rejects bad input and other methods', async () => {
    expect((await handler({ httpMethod: 'GET' })).statusCode).toBe(405);
    expect((await handler({ httpMethod: 'POST', body: 'not json' })).statusCode).toBe(400);
    expect((await post('')).statusCode).toBe(400);
    expect((await post('not-an-email')).statusCode).toBe(400);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('reports a configuration error when the Kartra keys are missing', async () => {
    delete process.env.KARTRA_API_PASSWORD;
    const response = await post('member@example.com');
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({ error: 'Authentication service is not configured' });
  });
});
