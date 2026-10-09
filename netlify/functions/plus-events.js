/*
 * Price-test log for Help Now Plus.
 *
 * The app posts one event at a time (utils/priceTest.ts):
 *   { type: "assignment", test, emailHash, product, assignedAt, eventId }
 *       the first time a caregiver is shown their price
 *   { type: "purchase", test, emailHash, product, purchasedAt, platform, transactionId, eventId }
 *       after a store purchase of Plus
 * emailHash is the 12-character sha256 prefix the login function keys its own log by
 * (users/<emailHash> in the "app-logins" store). A session without an email sends deviceHash
 * (the same shape, from a random id kept on the phone) instead. No email reaches this function.
 *
 * Records go to the Netlify Blobs store "app-plus":
 *   assignments/<test>/<user>        first write wins, so assignedAt is the first exposure
 *   purchases/<test>/<user>/<id>     one per store transaction (or per event when the store
 *                                    gave no transaction id)
 * <user> is "e-<emailHash>" or "d-<deviceHash>". scripts/plus-report.js reads them back.
 *
 * RevenueCat stays the record of what was paid; this log is for reading the test, and it is
 * an open endpoint, so it validates everything and stores nothing but these fields.
 */
let blobs = null;
try {
  blobs = require('@netlify/blobs');
} catch (_error) {
  blobs = null;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const STORE_NAME = 'app-plus';
const PRODUCTS = new Set(['help_now_plus_27', 'help_now_plus_37', 'help_now_plus_47']);
const PLATFORMS = new Set(['ios', 'android']);
const HASH_PATTERN = /^[0-9a-f]{12}$/;
const TEST_PATTERN = /^[a-z0-9-]{1,40}$/;
const EVENT_ID_PATTERN = /^[0-9a-f]{8,32}$/;
const MAX_BODY_BYTES = 2048;
const EARLIEST = Date.parse('2026-01-01T00:00:00Z');
const FUTURE_SLACK_MS = 24 * 60 * 60 * 1000;

function respond(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

/** The client's timestamp when it is a sane ISO date, else the time it arrived. */
function eventTime(value, now) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  if (Number.isFinite(time) && time >= EARLIEST && time <= now.getTime() + FUTURE_SLACK_MS) {
    return new Date(time).toISOString();
  }
  return now.toISOString();
}

/** Store transaction ids as a key segment: numbers on iOS, GPA.1234-5678-... on Google Play. */
function transactionKey(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().slice(0, 100).replace(/[^A-Za-z0-9._-]/g, '_');
  return cleaned || null;
}

function validate(body, now) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Event must be a JSON object' };
  if (body.type !== 'assignment' && body.type !== 'purchase') return { error: 'Unknown event type' };
  if (!TEST_PATTERN.test(String(body.test || ''))) return { error: 'test is not valid' };
  if (!PRODUCTS.has(body.product)) return { error: 'product is not valid' };

  const emailHash = HASH_PATTERN.test(String(body.emailHash || '')) ? body.emailHash : null;
  const deviceHash = HASH_PATTERN.test(String(body.deviceHash || '')) ? body.deviceHash : null;
  if (!emailHash && !deviceHash) return { error: 'emailHash or deviceHash is required' };
  const user = emailHash ? `e-${emailHash}` : `d-${deviceHash}`;
  const eventId = EVENT_ID_PATTERN.test(String(body.eventId || '')) ? body.eventId : null;

  const base = {
    test: body.test,
    emailHash,
    deviceHash: emailHash ? null : deviceHash,
    product: body.product,
    receivedAt: now.toISOString()
  };

  if (body.type === 'assignment') {
    return {
      key: `assignments/${body.test}/${user}`,
      record: { ...base, assignedAt: eventTime(body.assignedAt, now) }
    };
  }

  const transactionId = transactionKey(body.transactionId);
  const id = transactionId ? `t-${transactionId}` : eventId ? `e-${eventId}` : `r-${now.getTime()}`;
  return {
    key: `purchases/${body.test}/${user}/${id}`,
    record: {
      ...base,
      purchasedAt: eventTime(body.purchasedAt, now),
      platform: PLATFORMS.has(body.platform) ? body.platform : 'unknown',
      transactionId
    }
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }
  if (Buffer.byteLength(event.body || '', 'utf8') > MAX_BODY_BYTES) {
    return respond(413, { error: 'Event is too large' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '');
  } catch (_error) {
    return respond(400, { error: 'Request body must be JSON' });
  }

  const now = new Date();
  const result = validate(body, now);
  if (result.error) {
    return respond(400, { error: result.error });
  }

  if (!blobs || typeof blobs.getStore !== 'function') {
    return respond(503, { error: 'Event store is not available' });
  }
  try {
    if (typeof blobs.connectLambda === 'function') {
      blobs.connectLambda(event);
    }
    const store = blobs.getStore(STORE_NAME);
    // Retries and repeat assignments must not overwrite the first record.
    const write = await store.setJSON(result.key, result.record, { onlyIfNew: true });
    return respond(200, { ok: true, stored: Boolean(write && write.modified) });
  } catch (error) {
    console.error('Plus event not stored:', error.message);
    return respond(503, { error: 'Event store is not available' });
  }
};
