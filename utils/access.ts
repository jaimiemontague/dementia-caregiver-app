/**
 * Who sees what in the app.
 *
 *   free    the situation videos
 *   plus    everything free, plus the member layer (videos marked `tier: "member"` in
 *           data/videoData.json) and every cheat sheet
 *   member  everything in Plus, plus Help Now (sending Krista a question)
 *
 * Plus comes from a store purchase (RevenueCat, see contexts/PlusContext.tsx) or from the
 * login function, which returns "plus" for a purchase made outside the app. Members get
 * Plus included.
 */

export type AccessTier = 'free' | 'plus' | 'member';

/** Sent with every login so the function knows this build understands Plus. */
export const APP_TIERS: AccessTier[] = ['free', 'plus', 'member'];

/** A printable PDF attached to a situation. */
export type Cheatsheet = { title: string; url: string };

/** A situation video as data/videoData.json stores it; `tier: "member"` marks the member layer. */
export type GatedVideo = { videoUrl?: string; tier?: unknown };

/**
 * The login function's tier. Logins from before tiers existed returned none: those were
 * members. A tier this build doesn't know gets the least access.
 */
export function tierFromLogin(tier: unknown): AccessTier {
  if (tier === 'free' || tier === 'plus' || tier === 'member') return tier;
  return tier === undefined || tier === null ? 'member' : 'free';
}

export function hasPlusAccess(tier: AccessTier | null | undefined): boolean {
  return tier === 'plus' || tier === 'member';
}

export function isCheatsheet(entry: GatedVideo | Cheatsheet): entry is Cheatsheet {
  return 'url' in entry && !('videoUrl' in entry);
}

/** Member-layer videos and every cheat sheet need Plus (or a membership). */
export function needsPlus(entry: GatedVideo | Cheatsheet): boolean {
  return isCheatsheet(entry) || entry.tier === 'member';
}

/** Can a caregiver on this tier open this video or cheat sheet? */
export function canView(entry: GatedVideo | Cheatsheet | null | undefined, tier: AccessTier | null | undefined): boolean {
  if (!entry) return false;
  return !needsPlus(entry) || hasPlusAccess(tier);
}

/** A shelf (behavior or category) whose every situation needs Plus. An empty shelf is not one. */
export function isPlusShelf(situations: Record<string, GatedVideo> | null | undefined): boolean {
  const entries = Object.values(situations || {});
  return entries.length > 0 && entries.every((entry) => needsPlus(entry));
}

/**
 * The saved session after RevenueCat says whether this caregiver owns Plus, or null when
 * nothing changes. A free user who bought gets Plus, marked as coming from the store; Plus
 * from the store goes back to free when the store no longer has it (a refund). Members, and
 * Plus that the login function granted, are left alone.
 */
export function tierAfterStoreCheck<T extends { tier?: AccessTier; plusFromStore?: boolean }>(
  session: T,
  ownsPlus: boolean,
): T | null {
  if (ownsPlus && session.tier === 'free') {
    return { ...session, tier: 'plus', plusFromStore: true };
  }
  if (!ownsPlus && session.tier === 'plus' && session.plusFromStore) {
    return { ...session, tier: 'free', plusFromStore: false };
  }
  return null;
}
