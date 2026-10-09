/**
 * The Help Now Plus price test.
 *
 * Three non-consumable store products, one price each. Every caregiver is assigned one of
 * them deterministically from their emailHash (utils/identity.ts), or from a random id saved
 * on this phone when a session has no email, so the price is the same in every session and
 * on every phone. The app records the assignment the first time it shows the price (that
 * caregiver has now seen it), and every purchase, through the plus-events Netlify function
 * into the Blobs store "app-plus". scripts/plus-report.js reads them back. Only hashes leave
 * the phone, never an email.
 */
import { Storage } from '@/hooks/useWebStorage';
import { sha256Hex } from './sha256';
import { emailHash, normalizeEmail } from './identity';

export const PLUS_PRODUCTS = ['help_now_plus_27', 'help_now_plus_37', 'help_now_plus_47'] as const;
export type PlusProductId = (typeof PLUS_PRODUCTS)[number];

/** Part of every assignment. Changing it starts a new test: everyone is reassigned. */
export const PRICE_TEST_ID = 'plus-price-2026-10';

export const PLUS_EVENTS_URL = 'https://dementia-help-now.netlify.app/.netlify/functions/plus-events';

export type PriceTestUser = {
  /** utils/identity.ts emailHash, or null when the session has no email. */
  emailHash: string | null;
  /** Hash of this phone's random id, used only when there is no email. */
  deviceHash: string | null;
  product: PlusProductId;
};

type PlusEventBody =
  | { type: 'assignment'; assignedAt: string }
  | { type: 'purchase'; purchasedAt: string; platform: string; transactionId: string | null };

type QueuedEvent = PlusEventBody & {
  eventId: string;
  test: string;
  emailHash: string | null;
  deviceHash: string | null;
  product: PlusProductId;
};

const DEVICE_ID_KEY = 'plus_device_id';
const QUEUE_KEY = 'plus_events_queue';
const RECORDED_KEY = 'plus_assignments_recorded';
const PENDING_KEY = 'plus_pending_purchase';
const DEVICE_PRODUCT_KEY = 'plus_device_product';
// Not found (the function isn't deployed yet), timeout, too many requests: worth another try.
const RETRY_STATUSES = new Set([404, 408, 429]);
const MAX_QUEUE = 50;
const SEND_TIMEOUT_MS = 10000;

export function isPlusProduct(id: unknown): id is PlusProductId {
  return typeof id === 'string' && (PLUS_PRODUCTS as readonly string[]).includes(id);
}

/** The product (price) for a caregiver key: the same key always gets the same product. */
export function assignProduct(userKey: string): PlusProductId {
  const n = parseInt(sha256Hex(`${PRICE_TEST_ID}:${userKey}`).slice(0, 8), 16);
  return PLUS_PRODUCTS[n % PLUS_PRODUCTS.length];
}

function randomHex(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

/** A random id made once and kept on this phone: the fallback when a session has no email. */
export async function getDeviceId(): Promise<string> {
  const stored = await Storage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  const id = randomHex(32);
  await Storage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export async function priceTestUser(email: string | null | undefined): Promise<PriceTestUser> {
  if (normalizeEmail(email)) {
    const hash = emailHash(email);
    return { emailHash: hash, deviceHash: null, product: assignProduct(hash) };
  }
  const deviceHash = sha256Hex(await getDeviceId()).slice(0, 12);
  return { emailHash: null, deviceHash, product: assignProduct(`device:${deviceHash}`) };
}

function userMarker(user: PriceTestUser): string {
  return user.emailHash ?? `device:${user.deviceHash}`;
}

/** The Plus product this phone's store account bought or restored, kept for whoever logs in next. */
export async function rememberDeviceProduct(product: string | null | undefined): Promise<void> {
  if (isPlusProduct(product)) await Storage.setItem(DEVICE_PRODUCT_KEY, product);
}

/**
 * The product to offer this caregiver: their own price, unless this phone's store account
 * already owns a Plus product. Then that one, so a second login email on the same phone gets
 * the store's "already purchased" instead of paying again: each price is its own product, and
 * a store only refuses to sell the same product twice.
 */
export async function offerFor(user: PriceTestUser): Promise<PriceTestUser> {
  const owned = await Storage.getItem(DEVICE_PRODUCT_KEY);
  return isPlusProduct(owned) && owned !== user.product ? { ...user, product: owned } : user;
}

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await Storage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function enqueue(user: PriceTestUser, body: PlusEventBody, product: PlusProductId = user.product): Promise<void> {
  const queue = await readList<QueuedEvent>(QUEUE_KEY);
  queue.push({
    ...body,
    eventId: randomHex(16),
    test: PRICE_TEST_ID,
    emailHash: user.emailHash,
    deviceHash: user.deviceHash,
    product,
  });
  await Storage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
}

/** Record that this caregiver has seen their price. Once per caregiver and test. */
export async function recordAssignment(user: PriceTestUser, now: Date = new Date()): Promise<void> {
  const marker = `${PRICE_TEST_ID}:${userMarker(user)}`;
  const recorded = await readList<string>(RECORDED_KEY);
  if (recorded.includes(marker)) return;
  await enqueue(user, { type: 'assignment', assignedAt: now.toISOString() });
  await Storage.setItem(RECORDED_KEY, JSON.stringify([...recorded, marker].slice(-20)));
  await flushPlusEvents();
}

/** Record a store purchase of Plus (the product actually bought). */
export async function recordPurchase(
  user: PriceTestUser,
  purchase: { product: PlusProductId; platform: string; transactionId: string | null },
  now: Date = new Date(),
): Promise<void> {
  await enqueue(
    user,
    { type: 'purchase', purchasedAt: now.toISOString(), platform: purchase.platform, transactionId: purchase.transactionId },
    purchase.product,
  );
  await flushPlusEvents();
}

/**
 * A purchase the store is still waiting to approve (Ask to Buy, a slow payment method).
 * It is recorded by settlePendingPurchase once the store reports Plus as owned.
 */
export async function rememberPendingPurchase(user: PriceTestUser): Promise<void> {
  await Storage.setItem(PENDING_KEY, JSON.stringify({ user: userMarker(user), product: user.product }));
}

/** Record a remembered pending purchase now that the store has approved it (once, for the caregiver who made it). */
export async function settlePendingPurchase(
  user: PriceTestUser,
  approved: { product: string | null; platform: string; transactionId: string | null },
): Promise<void> {
  const raw = await Storage.getItem(PENDING_KEY);
  if (!raw) return;
  await Storage.removeItem(PENDING_KEY);
  let pending: { user?: string; product?: string } | null = null;
  try {
    pending = JSON.parse(raw);
  } catch {
    pending = null;
  }
  if (!pending || pending.user !== userMarker(user)) return;
  const product = isPlusProduct(approved.product) ? approved.product : isPlusProduct(pending.product) ? pending.product : user.product;
  await recordPurchase(user, { product, platform: approved.platform, transactionId: approved.transactionId });
}

/** True when the event is done with: stored, or refused for good (a bad request never improves). */
async function send(event: QueuedEvent): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch(PLUS_EVENTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    return response.ok || (response.status >= 400 && response.status < 500 && !RETRY_STATUSES.has(response.status));
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function sendQueued(): Promise<void> {
  const queue = await readList<QueuedEvent>(QUEUE_KEY);
  const done = new Set<string>();
  for (const event of queue) {
    if (await send(event)) done.add(event.eventId);
  }
  if (done.size) {
    // Re-read: events may have been queued while these were sending.
    const latest = await readList<QueuedEvent>(QUEUE_KEY);
    await Storage.setItem(QUEUE_KEY, JSON.stringify(latest.filter((event) => !done.has(event.eventId))));
  }
}

let flushing: Promise<void> | null = null;
let flushAgain = false;

/** Send what is queued; anything that fails stays for the next app start or event. */
export function flushPlusEvents(): Promise<void> {
  if (flushing) {
    // A send is under way and may have read the queue before the newest event: go round once more.
    flushAgain = true;
    return flushing;
  }
  flushing = (async () => {
    do {
      flushAgain = false;
      await sendQueued();
    } while (flushAgain);
  })()
    .catch(() => undefined)
    .finally(() => {
      flushing = null;
    });
  return flushing;
}
