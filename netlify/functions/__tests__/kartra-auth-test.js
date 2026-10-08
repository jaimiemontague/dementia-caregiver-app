jest.mock('axios', () => ({
  post: jest.fn(),
}));

const axios = require('axios');
const { handler } = require('../kartra-auth');

const originalEnvironment = process.env;

describe('kartra-auth Netlify function', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env = {
      ...originalEnvironment,
      KARTRA_API_KEY: 'test-api-key',
      KARTRA_API_PASSWORD: 'test-api-password',
      KARTRA_APP_ID: 'test-app-id',
    };
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('preserves the form-encoded Kartra request and returns active membership status', async () => {
    axios.post.mockResolvedValue({
      data: {
        status: 'Success',
        lead_details: {
          id: 'lead-123',
          email: 'member@example.com',
          memberships: [
            { id: 'active', active: '1' },
            { id: 'inactive', active: '0' },
          ],
        },
      },
    });

    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ email: 'member@example.com' }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      isVerified: true,
      hasActiveSubscription: true,
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      maxRedirects: 0,
      maxBodyLength: 16 * 1024,
      maxContentLength: 1024 * 1024,
      timeout: 10000,
    });
  });

  it('does not expose upstream response data when Kartra rejects a request', async () => {
    axios.post.mockRejectedValue({
      message: 'Request failed',
      response: {
        data: {
          internal: 'sensitive upstream response',
        },
      },
    });

    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ email: 'member@example.com' }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      isVerified: false,
      hasActiveSubscription: false,
      error: 'Verification failed',
    });
    expect(response.body).not.toContain('sensitive upstream response');
  });

  it('treats a lead without a memberships array as inactive', async () => {
    axios.post.mockResolvedValue({
      data: {
        status: 'Success',
        lead_details: {
          id: 'lead-456',
          email: 'inactive@example.com',
        },
      },
    });

    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ email: 'inactive@example.com' }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      isVerified: true,
      hasActiveSubscription: false,
      leadId: 'lead-456',
      email: 'inactive@example.com',
    });
  });
});
