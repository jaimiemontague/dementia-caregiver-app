/*
 * Login check for the Dementia Help Now app.
 *
 * The app posts { email, platform } and gets back a tier:
 *   member  - Kartra shows an active membership on any level
 *   free    - the email exists anywhere: a Kartra lead without a membership, or a
 *             contact in the Mailchimp audience in any status (subscribed,
 *             unsubscribed, cleaned, pending, archived). "Ever been on the list"
 *             is the rule, so access never depends on staying subscribed.
 *   (none)  - not found
 *
 * `isVerified` and `hasActiveSubscription` are kept for the store builds that
 * predate tiers: they admit on hasActiveSubscription alone, so it is true for
 * both tiers and `tier` is the field that gates member features.
 *
 * Every free-tier login is recorded in Mailchimp (first and last login date
 * fields, the tags "app user" and, from the second week on, "app returned").
 * Every login is also written to a small Netlify Blobs store when the runtime
 * provides one. Both are best effort and never fail the login.
 *
 * Environment: KARTRA_API_KEY, KARTRA_API_PASSWORD, KARTRA_APP_ID (required),
 * MAILCHIMP_API_KEY (required for the free tier), MAILCHIMP_LIST_ID (default
 * 6bea51ee85), APP_FIRST_LOGIN_FIELD / APP_LAST_LOGIN_FIELD (merge tags,
 * default APPFIRST / APPLAST), APP_USER_TAG / APP_RETURNED_TAG.
 */
const axios = require('axios');
const crypto = require('crypto');

let blobs = null;
try {
  blobs = require('@netlify/blobs');
} catch (error) {
  blobs = null;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const KARTRA_TIMEOUT_MS = 10000;
const MAILCHIMP_TIMEOUT_MS = 8000;
const RETURN_AFTER_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLATFORMS = new Set(['web', 'ios', 'android']);

function respond(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

function shortHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function mailchimpConfig() {
  const key = process.env.MAILCHIMP_API_KEY || '';
  if (!key.includes('-')) return null;
  const datacenter = key.slice(key.lastIndexOf('-') + 1);
  return {
    key,
    baseUrl: `https://${datacenter}.api.mailchimp.com/3.0`,
    listId: process.env.MAILCHIMP_LIST_ID || '6bea51ee85',
    firstLoginField: process.env.APP_FIRST_LOGIN_FIELD || 'APPFIRST',
    lastLoginField: process.env.APP_LAST_LOGIN_FIELD || 'APPLAST',
    userTag: process.env.APP_USER_TAG || 'app user',
    returnedTag: process.env.APP_RETURNED_TAG || 'app returned'
  };
}

// --- Kartra -----------------------------------------------------------------
async function lookupKartra(email) {
  const formData = new URLSearchParams();
  formData.append('api_key', process.env.KARTRA_API_KEY);
  formData.append('api_password', process.env.KARTRA_API_PASSWORD);
  formData.append('app_id', process.env.KARTRA_APP_ID);
  formData.append('get_lead[email]', email);

  const response = await axios.post('https://app.kartra.com/api', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0,
    maxBodyLength: 16 * 1024,
    maxContentLength: 1024 * 1024,
    timeout: KARTRA_TIMEOUT_MS
  });

  const data = response && response.data;
  if (!data || data.status !== 'Success' || !data.lead_details) {
    return { found: false };
  }
  const lead = data.lead_details;
  const memberships = Array.isArray(lead.memberships) ? lead.memberships : [];
  const hasActiveMembership = memberships.some((membership) => membership && membership.active === '1');
  return {
    found: true,
    leadId: lead.id,
    email: lead.email,
    hasActiveMembership
  };
}

// --- Mailchimp ------------------------------------------------------------------
async function mailchimpRequest(config, method, path, data) {
  return axios.request({
    method,
    url: config.baseUrl + path,
    data,
    auth: { username: 'app', password: config.key },
    timeout: MAILCHIMP_TIMEOUT_MS,
    maxRedirects: 0,
    maxContentLength: 1024 * 1024,
    validateStatus: () => true
  });
}

async function lookupMailchimp(config, email) {
  const hash = md5(email);
  const fields = ['id', 'email_address', 'status', `merge_fields.${config.firstLoginField}`, `merge_fields.${config.lastLoginField}`].join(',');
  const response = await mailchimpRequest(config, 'GET', `/lists/${config.listId}/members/${hash}?fields=${fields}`);
  if (response.status === 404) {
    return { found: false };
  }
  if (response.status !== 200 || !response.data) {
    throw new Error(`Mailchimp lookup failed (${response.status})`);
  }
  const merge = response.data.merge_fields || {};
  return {
    found: true,
    hash,
    contactId: response.data.id,
    status: response.data.status,
    firstLogin: merge[config.firstLoginField] || '',
    lastLogin: merge[config.lastLoginField] || ''
  };
}

async function recordFreeLogin(config, contact, now) {
  const today = isoDate(now);
  const mergeFields = { [config.lastLoginField]: today };
  if (!contact.firstLogin) {
    mergeFields[config.firstLoginField] = today;
  }
  await mailchimpRequest(config, 'PATCH', `/lists/${config.listId}/members/${contact.hash}`, { merge_fields: mergeFields });

  const tags = [{ name: config.userTag, status: 'active' }];
  if (contact.firstLogin) {
    const firstLogin = new Date(contact.firstLogin);
    const days = (now.getTime() - firstLogin.getTime()) / (24 * 60 * 60 * 1000);
    if (Number.isFinite(days) && days >= RETURN_AFTER_DAYS) {
      tags.push({ name: config.returnedTag, status: 'active' });
    }
  }
  await mailchimpRequest(config, 'POST', `/lists/${config.listId}/members/${contact.hash}/tags`, { tags });
}

// --- Netlify Blobs login log ------------------------------------------------------
async function recordLoginEvent(event, record, now) {
  if (!blobs || typeof blobs.getStore !== 'function') return;
  if (typeof blobs.connectLambda === 'function') {
    blobs.connectLambda(event);
  }
  const store = blobs.getStore('app-logins');
  const key = `users/${record.emailHash}`;
  const previous = (await store.get(key, { type: 'json' })) || null;
  const next = {
    emailHash: record.emailHash,
    tier: record.tier,
    firstLogin: (previous && previous.firstLogin) || now.toISOString(),
    lastLogin: now.toISOString(),
    logins: ((previous && previous.logins) || 0) + 1,
    platforms: Array.from(new Set([...((previous && previous.platforms) || []), record.platform]))
  };
  await store.setJSON(key, next);
}

// --- handler --------------------------------------------------------------------------
exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return respond(400, { error: 'Request body must be JSON' });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return respond(400, { error: 'Email is required' });
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return respond(400, { error: 'Email is not valid' });
  }
  const platform = PLATFORMS.has(body.platform) ? body.platform : 'unknown';

  if (!process.env.KARTRA_API_KEY || !process.env.KARTRA_API_PASSWORD || !process.env.KARTRA_APP_ID) {
    return respond(500, { error: 'Authentication service is not configured' });
  }
  const mailchimp = mailchimpConfig();
  if (!mailchimp) {
    console.warn('MAILCHIMP_API_KEY is not set: only Kartra leads and members can log in');
  }

  const now = new Date();
  const emailHash = shortHash(email);

  let kartra = null;
  let kartraFailed = false;
  try {
    kartra = await lookupKartra(email);
  } catch (error) {
    kartraFailed = true;
    console.error('Kartra verification request failed:', error.message);
  }

  if (kartra && kartra.found && kartra.hasActiveMembership) {
    try {
      await recordLoginEvent(event, { emailHash, tier: 'member', platform }, now);
    } catch (error) {
      console.warn('Login log skipped:', error.message);
    }
    return respond(200, {
      isVerified: true,
      hasActiveSubscription: true,
      tier: 'member',
      leadId: kartra.leadId,
      email: kartra.email || email,
      message: 'Access granted - active membership found'
    });
  }

  let contact = null;
  let mailchimpFailed = false;
  if (mailchimp) {
    try {
      contact = await lookupMailchimp(mailchimp, email);
    } catch (error) {
      mailchimpFailed = true;
      console.error('Mailchimp lookup failed:', error.message);
    }
  }

  const inKartra = Boolean(kartra && kartra.found);
  const inMailchimp = Boolean(contact && contact.found);

  if (inKartra || inMailchimp) {
    if (inMailchimp) {
      try {
        await recordFreeLogin(mailchimp, contact, now);
      } catch (error) {
        console.warn('Mailchimp login record skipped:', error.message);
      }
    }
    try {
      await recordLoginEvent(event, { emailHash, tier: 'free', platform }, now);
    } catch (error) {
      console.warn('Login log skipped:', error.message);
    }
    return respond(200, {
      isVerified: true,
      hasActiveSubscription: true,
      tier: 'free',
      leadId: (inKartra && kartra.leadId) || (inMailchimp && contact.contactId) || '',
      email: (inKartra && kartra.email) || email,
      message: 'Access granted - free tier'
    });
  }

  if (kartraFailed || mailchimpFailed) {
    return respond(200, {
      isVerified: false,
      hasActiveSubscription: false,
      tier: null,
      error: 'Verification failed'
    });
  }

  return respond(200, {
    isVerified: false,
    hasActiveSubscription: false,
    tier: null,
    message: 'Email not found in system'
  });
};
