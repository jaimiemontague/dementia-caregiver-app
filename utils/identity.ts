import { sha256Hex } from './sha256';

/** The login email as the login function sees it: trimmed and lowercase. */
export function normalizeEmail(email: string | null | undefined): string {
  return String(email || '').trim().toLowerCase();
}

/**
 * The first 12 hex characters of sha256(lowercase email): the key the login function
 * writes to its Netlify Blobs log (users/<emailHash>). Plus uses the same value as the
 * RevenueCat app user id and in the price-test records, so the three line up and no
 * email ever leaves the phone for them.
 */
export function emailHash(email: string | null | undefined): string {
  return sha256Hex(normalizeEmail(email)).slice(0, 12);
}
